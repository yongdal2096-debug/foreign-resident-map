"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { District, MetricKey, Province } from "./ResidentDashboard";

interface LatLngLike {
  lat(): number;
  lng(): number;
}

interface MapLike {
  setCenter(center: LatLngLike): void;
  setZoom(zoom: number): void;
}

interface OverlayLike {
  setMap(map: MapLike | null): void;
}

interface HeatMapLike extends OverlayLike {
  setData(data: unknown[]): void;
  redraw(): void;
}

interface GeocodeResponse {
  v2?: {
    addresses?: Array<{ x: string; y: string }>;
  };
}

interface NaverApi {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => MapLike;
    LatLng: new (lat: number, lng: number) => LatLngLike;
    Marker: new (options: Record<string, unknown>) => OverlayLike;
    Position: { RIGHT_CENTER: string };
    Event: {
      addListener(target: unknown, eventName: string, listener: () => void): unknown;
      removeListener(listener: unknown): void;
    };
    Service: {
      Status: { OK: string };
      geocode(
        options: { query: string },
        callback: (status: string, response: GeocodeResponse) => void,
      ): void;
    };
    visualization: {
      HeatMap: new (options: Record<string, unknown>) => HeatMapLike;
      SpectrumStyle: { HOT: unknown };
    };
    jsContentLoaded?: boolean;
    onJSContentLoaded?: () => void;
  };
}

declare global {
  interface Window {
    naver?: NaverApi;
  }
}

interface MapPoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
  value: number;
  province?: Province;
}

let naverLoader: Promise<NaverApi> | null = null;

function loadNaverSdk(clientId: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.naver?.maps) return Promise.resolve(window.naver);
  if (naverLoader) return naverLoader;

  naverLoader = new Promise<NaverApi>((resolve, reject) => {
    const finish = () => {
      if (!window.naver?.maps) {
        reject(new Error("Naver Maps SDK did not initialize"));
        return;
      }
      if (window.naver.maps.jsContentLoaded === false) {
        window.naver.maps.onJSContentLoaded = () => resolve(window.naver as NaverApi);
      } else {
        resolve(window.naver);
      }
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-resident-naver-map]");
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Naver Maps SDK load failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.dataset.residentNaverMap = "true";
    script.async = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&submodules=visualization,geocoder`;
    script.onload = finish;
    script.onerror = () => reject(new Error("Naver Maps SDK load failed"));
    document.head.appendChild(script);
  });

  return naverLoader;
}

function compact(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 1 : 2)}만`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천`;
  return new Intl.NumberFormat("ko-KR").format(value);
}

function cacheKey(province: Province, district: District) {
  return `resident-map-geocode:v1:${province.name}:${district.name}`;
}

function geocodeDistrict(naver: NaverApi, province: Province, district: District) {
  return new Promise<{ lat: number; lng: number } | null>((resolve) => {
    naver.maps.Service.geocode(
      { query: `${province.name} ${district.name}` },
      (status, response) => {
        if (status !== naver.maps.Service.Status.OK) {
          resolve(null);
          return;
        }
        const address = response.v2?.addresses?.[0];
        if (!address) {
          resolve(null);
          return;
        }
        const lat = Number(address.y);
        const lng = Number(address.x);
        resolve(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null);
      },
    );
  });
}

async function resolveDistricts(naver: NaverApi, province: Province) {
  const resolved: MapPoint[] = [];
  const pending: District[] = [];

  for (const district of province.districts) {
    if (district.lat !== null && district.lng !== null) {
      resolved.push({
        id: district.name,
        label: district.name,
        lat: district.lat,
        lng: district.lng,
        value: 0,
      });
      continue;
    }
    const cached = sessionStorage.getItem(cacheKey(province, district));
    if (cached) {
      try {
        const coordinate = JSON.parse(cached) as { lat: number; lng: number };
        resolved.push({ id: district.name, label: district.name, ...coordinate, value: 0 });
        continue;
      } catch {
        sessionStorage.removeItem(cacheKey(province, district));
      }
    }
    pending.push(district);
  }

  for (let index = 0; index < pending.length; index += 5) {
    const batch = pending.slice(index, index + 5);
    const coordinates = await Promise.all(
      batch.map((district) => geocodeDistrict(naver, province, district)),
    );
    coordinates.forEach((coordinate, batchIndex) => {
      if (!coordinate) return;
      const district = batch[batchIndex];
      sessionStorage.setItem(cacheKey(province, district), JSON.stringify(coordinate));
      resolved.push({
        id: district.name,
        label: district.name,
        ...coordinate,
        value: 0,
      });
    });
  }

  return resolved;
}

export default function NaverResidentMap({
  clientId,
  provinces,
  selectedProvince,
  metric,
  onSelectProvince,
}: {
  clientId: string;
  provinces: Province[];
  selectedProvince: Province | null;
  metric: MetricKey;
  onSelectProvince: (province: Province) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const heatMapRef = useRef<HeatMapLike | null>(null);
  const markerRefs = useRef<OverlayLike[]>([]);
  const listenerRefs = useRef<unknown[]>([]);
  const [naver, setNaver] = useState<NaverApi | null>(null);
  const [districtCoordinates, setDistrictCoordinates] = useState<MapPoint[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    loadNaverSdk(clientId)
      .then((api) => {
        if (cancelled || !elementRef.current) return;
        const map = new api.maps.Map(elementRef.current, {
          center: new api.maps.LatLng(36.25, 127.8),
          zoom: 6,
          zoomControl: true,
          zoomControlOptions: { position: api.maps.Position.RIGHT_CENTER },
          mapDataControl: false,
          scaleControl: false,
        });
        mapRef.current = map;
        setNaver(api);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!naver || !selectedProvince) {
      setDistrictCoordinates([]);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    resolveDistricts(naver, selectedProvince)
      .then((coordinates) => {
        if (cancelled) return;
        setDistrictCoordinates(coordinates);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [naver, selectedProvince]);

  const points = useMemo<MapPoint[]>(() => {
    if (!selectedProvince) {
      return provinces.map((province) => ({
        id: province.name,
        label: province.shortName,
        lat: province.lat,
        lng: province.lng,
        value: province[metric],
        province,
      }));
    }
    const districtByName = new Map(
      selectedProvince.districts.map((district) => [district.name, district]),
    );
    return districtCoordinates.map((point) => ({
      ...point,
      value: districtByName.get(point.id)?.[metric] ?? 0,
    }));
  }, [districtCoordinates, metric, provinces, selectedProvince]);

  useEffect(() => {
    if (!naver || !mapRef.current || points.length === 0) return;
    const map = mapRef.current;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];
    listenerRefs.current.forEach((listener) => naver.maps.Event.removeListener(listener));
    listenerRefs.current = [];
    heatMapRef.current?.setMap(null);

    const heatData = points.map((point) => ({
      weight: point.value,
      location: [point.lng, point.lat],
    }));
    heatMapRef.current = new naver.maps.visualization.HeatMap({
      map,
      data: heatData,
      colorMap: naver.maps.visualization.SpectrumStyle.HOT,
      radius: selectedProvince ? 34 : 48,
      opacity: 0.68,
    });

    const maxValue = Math.max(...points.map((point) => point.value), 1);
    for (const point of points) {
      const intensity = Math.sqrt(point.value / maxValue);
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(point.lat, point.lng),
        icon: {
          content: `<button class="naver-data-marker" style="--marker-heat:${intensity.toFixed(3)}" aria-label="${point.label} ${compact(point.value)}"><span>${point.label}</span><strong>${compact(point.value)}</strong></button>`,
          anchor: { x: 32, y: 32 },
        },
        zIndex: Math.round(intensity * 100),
      });
      markerRefs.current.push(marker);
      if (point.province) {
        const listener = naver.maps.Event.addListener(marker, "click", () => {
          onSelectProvince(point.province as Province);
        });
        listenerRefs.current.push(listener);
      }
    }

    const center = selectedProvince
      ? new naver.maps.LatLng(selectedProvince.lat, selectedProvince.lng)
      : new naver.maps.LatLng(36.25, 127.8);
    map.setCenter(center);
    map.setZoom(selectedProvince ? (selectedProvince.shortName === "제주" ? 10 : 9) : 6);

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
      listenerRefs.current.forEach((listener) => naver.maps.Event.removeListener(listener));
      listenerRefs.current = [];
      heatMapRef.current?.setMap(null);
    };
  }, [naver, onSelectProvince, points, selectedProvince]);

  return (
    <div className="naver-map-wrap">
      <div ref={elementRef} className="naver-map-canvas" aria-label="네이버 지도 기반 외국인 체류 밀집도" />
      {status === "loading" && <div className="map-loading"><i />행정구역 좌표를 불러오는 중</div>}
      {status === "error" && <div className="map-error">지도 또는 지오코딩 기능을 확인해 주세요.</div>}
      <div className="map-provider-badge">NAVER MAPS · HEATMAP</div>
    </div>
  );
}
