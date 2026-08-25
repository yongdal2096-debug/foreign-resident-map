"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Counts, District, Province } from "./ResidentDashboard";

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
  district?: District;
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
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&submodules=geocoder`;
    script.onload = finish;
    script.onerror = () => reject(new Error("Naver Maps SDK load failed"));
    document.head.appendChild(script);
  });

  return naverLoader;
}

function rateFor(entity: Counts) {
  return entity.population ? (entity.chinaCombined / entity.population) * 100 : 0;
}

function formatPer100(rate: number) {
  return rate.toFixed(rate >= 10 ? 1 : 2);
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
        district,
      });
      continue;
    }
    const cached = sessionStorage.getItem(cacheKey(province, district));
    if (cached) {
      try {
        const coordinate = JSON.parse(cached) as { lat: number; lng: number };
        resolved.push({ id: district.name, label: district.name, ...coordinate, value: 0, district });
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
        district,
      });
    });
  }

  return resolved;
}

export default function NaverResidentMap({
  clientId,
  provinces,
  selectedProvince,
  onSelectProvince,
  onSelectDistrict,
}: {
  clientId: string;
  provinces: Province[];
  selectedProvince: Province | null;
  onSelectProvince: (province: Province) => void;
  onSelectDistrict: (province: Province, district: District) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
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
      const frame = window.requestAnimationFrame(() => {
        setDistrictCoordinates([]);
        if (naver) setStatus("ready");
      });
      return () => window.cancelAnimationFrame(frame);
    }
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      setDistrictCoordinates([]);
      setStatus("loading");
      resolveDistricts(naver, selectedProvince)
        .then((coordinates) => {
          if (cancelled) return;
          setDistrictCoordinates(coordinates);
          setStatus("ready");
        })
        .catch(() => !cancelled && setStatus("error"));
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [naver, selectedProvince]);

  const points = useMemo<MapPoint[]>(() => {
    if (!selectedProvince) {
      return provinces.map((province) => ({
        id: province.name,
        label: province.shortName,
        lat: province.lat,
        lng: province.lng,
        value: rateFor(province),
        province,
      }));
    }
    const districtByName = new Map(
      selectedProvince.districts.map((district) => [district.name, district]),
    );
    return districtCoordinates.map((point) => ({
      ...point,
      value: districtByName.has(point.id)
        ? rateFor(districtByName.get(point.id) as District)
        : 0,
      district: districtByName.get(point.id),
    }));
  }, [districtCoordinates, provinces, selectedProvince]);

  useEffect(() => {
    if (!naver || !mapRef.current || points.length === 0) return;
    const map = mapRef.current;

    const drawablePoints = points.filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        Number.isFinite(point.value) &&
        point.value >= 0,
    );
    if (drawablePoints.length === 0) return;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];
    listenerRefs.current.forEach((listener) => naver.maps.Event.removeListener(listener));
    listenerRefs.current = [];
    const maxValue = Math.max(...drawablePoints.map((point) => point.value), 1);

    for (const point of drawablePoints) {
      const intensity = Math.sqrt(point.value / maxValue);
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(point.lat, point.lng),
        icon: {
          content: `<button class="naver-data-marker" style="--marker-heat:${intensity.toFixed(3)}" aria-label="${point.label} 지역 인구 100명당 ${formatPer100(point.value)}명"><span>${point.label}</span><strong>${formatPer100(point.value)}명</strong></button>`,
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
      } else if (selectedProvince && point.district) {
        const listener = naver.maps.Event.addListener(marker, "click", () => {
          onSelectDistrict(selectedProvince, point.district as District);
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
    };
  }, [naver, onSelectDistrict, onSelectProvince, points, selectedProvince]);

  if (status === "error") {
    return <div className="map-connection-note">지도 연결이 불안정해 기본 데이터 지도로 표시합니다.</div>;
  }

  return (
    <div className={`naver-map-wrap naver-map-wrap--${status}`}>
      <div ref={elementRef} className="naver-map-canvas" aria-label="네이버 지도 기반 지역 인구 100명당 중국계 등록외국인 수" />
      {status === "loading" && <div className="map-loading"><i />행정구역 좌표를 불러오는 중</div>}
      <div className="map-provider-badge">NAVER MAPS · DATA BUBBLES</div>
    </div>
  );
}
