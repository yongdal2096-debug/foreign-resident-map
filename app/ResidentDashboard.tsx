"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NaverResidentMap from "./NaverResidentMap";

export type MetricKey =
  | "chinaCombined"
  | "china"
  | "koreanChinese"
  | "studentD2"
  | "workerE9";

export interface Counts {
  total: number;
  china: number;
  koreanChinese: number;
  chinaCombined: number;
  residentPopulation: number;
  population: number;
  studentD2: number;
  workerE9: number;
}

export interface District extends Counts {
  name: string;
  lat: number | null;
  lng: number | null;
}

export interface Province extends Counts {
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  districts: District[];
}

export interface ResidentData {
  meta: {
    asOf: string;
    published: string;
    dataset: string;
    provider: string;
    sourcePage: string;
    sourceFile: string;
    visaSourceFile: string;
    populationDataset: string;
    populationProvider: string;
    populationSourcePage: string;
    populationSourceFile: string;
    dataGoKrDataset: string;
    dataGoKrApi: string;
    notes: string[];
  };
  national: Counts;
  provinces: Province[];
}

interface DashboardProps {
  data: ResidentData;
  naverClientId: string;
}

interface Selection {
  province: Province;
  district?: District;
}

const PRIMARY_METRIC: MetricKey = "chinaCombined";
const numberFormat = new Intl.NumberFormat("ko-KR");

function per100(part: number, population: number) {
  return population ? (part / population) * 100 : 0;
}

function rateFor(entity: Counts) {
  return per100(entity[PRIMARY_METRIC], entity.population);
}

function formatPer100(rate: number) {
  return rate.toFixed(rate >= 10 ? 1 : 2);
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h3c5 0 5 10 10 10h3M17 4l3 3-3 3M4 17h3c2.2 0 3.4-1.9 4.5-4M17 14l3 3-3 3" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="m5.5 17 4.2-4 3 2.5 2.4-2.2 3.4 3.7" />
    </svg>
  );
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function fitCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  weight = 900,
) {
  let size = initialSize;
  do {
    context.font = `${weight} ${size}px Pretendard, "Noto Sans KR", Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 2;
  } while (size > 28);
  return size;
}

async function createShareCard({
  resultLabel,
  regionLabel,
  value,
  rate,
  nationalRate,
  rank,
  rankTotal,
  rankScope,
  comparisonText,
  asOf,
  siteHost,
}: {
  resultLabel: string;
  regionLabel: string;
  value: number;
  rate: number;
  nationalRate: number;
  rank: number;
  rankTotal: number;
  rankScope: string;
  comparisonText: string;
  asOf: string;
  siteHost: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.fillStyle = "#f6f3eb";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(16,45,47,.055)";
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  context.fillStyle = "rgba(119,201,183,.22)";
  context.beginPath();
  context.arc(1115, 52, 245, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(240,107,76,.13)";
  context.beginPath();
  context.arc(1025, 610, 210, 0, Math.PI * 2);
  context.fill();

  context.shadowColor = "rgba(16,45,47,.14)";
  context.shadowBlur = 42;
  context.shadowOffsetY = 15;
  roundedRect(context, 52, 46, 1096, 583, 38);
  context.fillStyle = "#fffefb";
  context.fill();
  context.shadowColor = "transparent";

  context.fillStyle = "#102d2f";
  context.beginPath();
  context.arc(104, 98, 24, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#77c9b7";
  context.fillRect(94, 95, 5, 9);
  context.fillRect(102, 88, 5, 16);
  context.fillRect(110, 92, 5, 12);

  context.fillStyle = "#102d2f";
  context.font = '900 25px Pretendard, "Noto Sans KR", Arial, sans-serif';
  context.fillText("우리동네 세계지도", 142, 107);
  context.fillStyle = "#087a70";
  context.font = '800 17px Pretendard, "Noto Sans KR", Arial, sans-serif';
  context.fillText(`${asOf.slice(0, 7).replace("-", ".")} 기준 · 법무부 공개통계`, 832, 105);

  context.fillStyle = "#087a70";
  context.font = '900 17px Pretendard, "Noto Sans KR", Arial, sans-serif';
  context.fillText(regionLabel, 96, 183);
  context.fillStyle = "#102d2f";
  const labelSize = fitCanvasText(context, resultLabel, 620, 58);
  context.font = `900 ${labelSize}px Pretendard, "Noto Sans KR", Arial, sans-serif`;
  context.fillText(resultLabel, 94, 244);
  context.fillStyle = "#52696b";
  context.font = '700 21px Pretendard, "Noto Sans KR", Arial, sans-serif';
  context.fillText("지역 인구 100명당 · 중국+한국계 중국인 등록외국인", 98, 282);

  context.fillStyle = "#102d2f";
  context.font = '900 84px Pretendard, "Noto Sans KR", Arial, sans-serif';
  const rateLabel = formatPer100(rate);
  context.fillText(rateLabel, 92, 379);
  const numberWidth = context.measureText(rateLabel).width;
  context.fillStyle = "#f06b4c";
  context.font = '900 25px Pretendard, "Noto Sans KR", Arial, sans-serif';
  context.fillText("명", 104 + numberWidth, 374);

  roundedRect(context, 692, 167, 390, 207, 26);
  context.fillStyle = "#102d2f";
  context.fill();
  context.fillStyle = "#77c9b7";
  context.font = '900 16px Pretendard, "Noto Sans KR", Arial, sans-serif';
  context.fillText("체감 vs 통계", 727, 217);
  context.fillStyle = "#ffffff";
  context.font = '900 34px Pretendard, "Noto Sans KR", Arial, sans-serif';
  const comparisonLines = comparisonText.startsWith("전국 평균보다 ")
    ? ["전국 평균보다", comparisonText.replace("전국 평균보다 ", "")]
    : comparisonText.startsWith("전국 평균의 ")
      ? ["전국 평균의", comparisonText.replace("전국 평균의 ", "")]
      : ["전국 평균과", "비슷한 수준"];
  comparisonLines.forEach((line, index) => context.fillText(line, 727, 272 + index * 45));

  const metrics = [
    ["실제 등록 인원", `${numberFormat.format(value)}명`],
    [`비율 기준 ${rankScope} 순위`, `${rank} / ${rankTotal}위`],
    ["전국 100명당 평균", `${formatPer100(nationalRate)}명`],
  ];
  metrics.forEach(([label, metricValue], index) => {
    const x = 92 + index * 337;
    roundedRect(context, x, 435, 310, 104, 19);
    context.fillStyle = index === 2 ? "#e8f4ef" : "#f1f2ed";
    context.fill();
    context.fillStyle = "#68797a";
    context.font = '750 15px Pretendard, "Noto Sans KR", Arial, sans-serif';
    context.fillText(label, x + 22, 468);
    context.fillStyle = index === 2 ? "#075b55" : "#102d2f";
    context.font = '900 28px Pretendard, "Noto Sans KR", Arial, sans-serif';
    context.fillText(metricValue, x + 22, 509);
  });

  context.fillStyle = "#7e8b8c";
  context.font = '700 14px Pretendard, "Noto Sans KR", Arial, sans-serif';
  context.fillText("지역 인구 = 주민등록인구 + 등록외국인 · 개인 위치가 아닌 공개 합계", 94, 588);
  context.textAlign = "right";
  context.fillStyle = "#087a70";
  context.font = '850 13px Pretendard, "Noto Sans KR", Arial, sans-serif';
  context.fillText(`${siteHost} · #우리동네세계지도`, 1102, 588);
  context.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Card export failed"))), "image/png", 1);
  });
}

function SchematicMap({
  provinces,
  selectedProvince,
  onSelectProvince,
  onSelectDistrict,
}: {
  provinces: Province[];
  selectedProvince: Province | null;
  onSelectProvince: (province: Province) => void;
  onSelectDistrict: (province: Province, district: District) => void;
}) {
  const points: Array<{
    id: string;
    label: string;
    entity: Counts;
    lat: number;
    lng: number;
    province?: Province;
    district?: District;
  }> = selectedProvince
    ? selectedProvince.districts
        .filter((district) => district.lat !== null && district.lng !== null)
        .map((district) => ({
          id: district.name,
          label: district.name,
          entity: district,
          lat: district.lat as number,
          lng: district.lng as number,
          district,
        }))
    : provinces.map((province) => ({
        id: province.name,
        label: province.shortName,
        entity: province,
        lat: province.lat,
        lng: province.lng,
        province,
      }));

  if (selectedProvince && points.length === 0) {
    const districtRanking = [...selectedProvince.districts].sort(
      (a, b) => rateFor(b) - rateFor(a),
    );
    return (
      <div className="rank-map" aria-label={`${selectedProvince.name} 시군구 결과`}>
        <div className="rank-map__title">
          <span>{selectedProvince.shortName}</span>
          <strong>어느 동네가 궁금하세요?</strong>
          <p>지역을 누르면 공개 통계 결과가 2초 뒤 공개됩니다.</p>
        </div>
        <div className="rank-map__rows">
          {districtRanking.slice(0, 6).map((district, index) => (
            <button
              className="rank-map__row"
              key={district.name}
              type="button"
              onClick={() => onSelectDistrict(selectedProvince, district)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{district.name}</strong>
              <b>{formatPer100(rateFor(district))}명 / 100명</b>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const values = points.map((point) => rateFor(point.entity));
  const maxValue = Math.max(...values, 1);
  const lngs = points.map((point) => point.lng);
  const lats = points.map((point) => point.lat);
  const bounds = selectedProvince
    ? {
        minLng: Math.min(...lngs) - 0.08,
        maxLng: Math.max(...lngs) + 0.08,
        minLat: Math.min(...lats) - 0.08,
        maxLat: Math.max(...lats) + 0.08,
      }
    : { minLng: 125.9, maxLng: 129.65, minLat: 33.1, maxLat: 38.35 };

  return (
    <div
      className={`schematic-map ${selectedProvince ? "schematic-map--local" : ""}`}
      role="img"
      aria-label={selectedProvince ? `${selectedProvince.name} 분포 개략도` : "전국 시도별 분포 개략도"}
    >
      <div className="schematic-map__grid" />
      <div className="schematic-map__caption">공개 집계 데이터 · 개인 위치 아님</div>
      {points.map((point) => {
        const x = ((point.lng - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.01)) * 100;
        const y = ((bounds.maxLat - point.lat) / Math.max(bounds.maxLat - bounds.minLat, 0.01)) * 100;
        const rate = rateFor(point.entity);
        const intensity = Math.sqrt(rate / maxValue);
        const size = 48 + intensity * 54;
        return (
          <button
            className="map-bubble"
            key={point.id}
            style={{
              left: `${Math.min(94, Math.max(6, x))}%`,
              top: `${Math.min(92, Math.max(8, y))}%`,
              width: `${size}px`,
              height: `${size}px`,
              zIndex: Math.round(intensity * 10) + 1,
              "--heat": intensity,
            } as React.CSSProperties}
            type="button"
            onClick={() => {
              if (point.province) onSelectProvince(point.province);
              if (selectedProvince && point.district) onSelectDistrict(selectedProvince, point.district);
            }}
            aria-label={`${point.label} 지역 인구 100명당 ${formatPer100(rate)}명`}
          >
            <span>{point.label}</span>
            <strong>{formatPer100(rate)}명</strong>
          </button>
        );
      })}
    </div>
  );
}

export default function ResidentDashboard({ data, naverClientId }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapProvinceName, setMapProvinceName] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealDuration, setRevealDuration] = useState(2100);
  const [copied, setCopied] = useState(false);
  const [cardShared, setCardShared] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredFromUrl = useRef(false);
  const hasRevealed = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProvince =
    data.provinces.find((province) => province.name === mapProvinceName) ?? null;

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const results: Selection[] = [];
    for (const province of data.provinces) {
      if (
        province.name.toLowerCase().includes(query) ||
        province.shortName.toLowerCase().includes(query)
      ) {
        results.push({ province });
      }
      for (const district of province.districts) {
        if (district.name.toLowerCase().includes(query)) {
          results.push({ province, district });
        }
      }
    }
    return results.slice(0, 7);
  }, [data.provinces, searchQuery]);

  const quickRegions = useMemo(
    () =>
      data.provinces
        .flatMap((province) => province.districts.map((district) => ({ province, district })))
        .sort((a, b) => rateFor(b.district) - rateFor(a.district))
        .slice(0, 3),
    [data.provinces],
  );

  const nationwideTop = useMemo(
    () => [...data.provinces].sort((a, b) => rateFor(b) - rateFor(a)).slice(0, 3),
    [data.provinces],
  );

  const featuredJeju = useMemo(
    () => data.provinces.find((province) => province.shortName === "제주") ?? null,
    [data.provinces],
  );

  const buildResultUrl = useCallback((
    province: Province,
    district?: District,
    shareChannel?: "x" | "copy" | "card",
  ) => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("region", province.shortName);
    if (district) url.searchParams.set("district", district.name);
    else url.searchParams.delete("district");
    if (shareChannel) {
      url.searchParams.set("utm_source", shareChannel);
      url.searchParams.set("utm_medium", "share");
      url.searchParams.set("utm_campaign", "neighborhood_map");
    } else {
      url.searchParams.delete("utm_source");
      url.searchParams.delete("utm_medium");
      url.searchParams.delete("utm_campaign");
    }
    url.hash = "result";
    return url.toString();
  }, []);

  const openResult = useCallback(
    (province: Province, district?: District, animate = true) => {
      setMapProvinceName(province.name);
      setSelection({ province, district });
      setSearchQuery("");
      setCopied(false);
      setCardShared(false);
      if (revealTimer.current) clearTimeout(revealTimer.current);
      setRevealing(animate);
      const revealDelay = hasRevealed.current ? 700 : 2100;
      setRevealDuration(revealDelay);
      if (animate) revealTimer.current = setTimeout(() => setRevealing(false), revealDelay);
      if (animate) hasRevealed.current = true;
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", buildResultUrl(province, district));
        if (window.matchMedia("(max-width: 820px)").matches) {
          if (scrollTimer.current) clearTimeout(scrollTimer.current);
          scrollTimer.current = setTimeout(
            () => document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "center" }),
            120,
          );
        }
      }
    },
    [buildResultUrl],
  );

  useEffect(() => {
    if (restoredFromUrl.current || typeof window === "undefined") return;
    restoredFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const regionParam = params.get("region");
    if (!regionParam) return;
    const province = data.provinces.find(
      (item) => item.shortName === regionParam || item.name === regionParam,
    );
    if (!province) return;
    const districtParam = params.get("district");
    const district = districtParam
      ? province.districts.find((item) => item.name === districtParam)
      : undefined;
    const timer = window.setTimeout(() => openResult(province, district, true), 0);
    return () => window.clearTimeout(timer);
  }, [data.provinces, openResult]);

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      if (cardTimer.current) clearTimeout(cardTimer.current);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    },
    [],
  );

  const resultEntity = selection?.district ?? selection?.province ?? null;
  const resultLabel = selection?.district?.name ?? selection?.province.name ?? "";
  const resultValue = resultEntity?.[PRIMARY_METRIC] ?? 0;
  const nationalRate = rateFor(data.national);
  const resultRate = resultEntity ? rateFor(resultEntity) : 0;
  const relativeRatio = nationalRate ? resultRate / nationalRate : 0;
  const comparisonText = relativeRatio >= 1.1
    ? `전국 평균보다 ${relativeRatio.toFixed(1)}배 높은 수준`
    : relativeRatio <= 0.9
      ? `전국 평균의 ${relativeRatio.toFixed(1)}배 수준`
      : "전국 평균과 비슷한 수준";

  const resultRank = useMemo(() => {
    if (!selection) return null;
    const pool = selection.district ? selection.province.districts : data.provinces;
    const sorted = [...pool].sort((a, b) => rateFor(b) - rateFor(a));
    const targetName = selection.district?.name ?? selection.province.name;
    const rank = sorted.findIndex((item) => item.name === targetName) + 1;
    return {
      rank,
      total: pool.length,
      scope: selection.district ? selection.province.shortName : "전국",
    };
  }, [data.provinces, selection]);

  function resetMap() {
    setSelection(null);
    setMapProvinceName(null);
    setRevealing(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("region");
      url.searchParams.delete("district");
      url.hash = "";
      window.history.replaceState({}, "", url.toString());
    }
  }

  function closeResult() {
    setSelection(null);
    setRevealing(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("region");
      url.searchParams.delete("district");
      url.hash = "";
      window.history.replaceState({}, "", url.toString());
    }
  }

  function openRandomDistrict() {
    const allDistricts = data.provinces.flatMap((province) =>
      province.districts.map((district) => ({ province, district })),
    );
    const random = allDistricts[Math.floor(Math.random() * allDistricts.length)];
    openResult(random.province, random.district);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstResult = searchResults[0];
    if (firstResult) openResult(firstResult.province, firstResult.district);
  }

  function searchAnotherNeighborhood() {
    resetMap();
    window.requestAnimationFrame(() => {
      document.getElementById("top")?.scrollIntoView({ behavior: "smooth", block: "start" });
      searchInputRef.current?.focus();
    });
  }

  function resultText() {
    if (!selection || !resultRank) return "";
    const regionHashtag = resultLabel.replace(/\s+/g, "");
    return `${resultLabel}, 체감과 공개통계가 같을까?\n\n지역 인구 100명당 중국·한국계 중국인 등록외국인 ${formatPer100(resultRate)}명\n실제 등록 인원 ${numberFormat.format(resultValue)}명 · 비율 기준 ${resultRank.scope} ${resultRank.total}개 지역 중 ${resultRank.rank}위\n전국 평균은 100명당 ${formatPer100(nationalRate)}명\n\n친구 동네도 확인해보세요. #우리동네세계지도 #${regionHashtag}`;
  }

  function shareToX() {
    if (!selection) return;
    const intent = new URL("https://x.com/intent/post");
    intent.searchParams.set("text", resultText());
    intent.searchParams.set("url", buildResultUrl(selection.province, selection.district, "x"));
    window.open(intent.toString(), "_blank", "noopener,noreferrer");
  }

  async function shareOrCopy() {
    if (!selection) return;
    const url = buildResultUrl(selection.province, selection.district, "copy");
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1800);
  }

  async function shareResultCard() {
    if (!selection || !resultRank) return;
    const resultUrl = buildResultUrl(selection.province, selection.district, "card");
    const blob = await createShareCard({
      resultLabel,
      regionLabel: selection.district
        ? `${selection.province.shortName} · ${selection.district.name}`
        : `${selection.province.name} 전체`,
      value: resultValue,
      rate: resultRate,
      nationalRate,
      rank: resultRank.rank,
      rankTotal: resultRank.total,
      rankScope: resultRank.scope,
      comparisonText,
      asOf: data.meta.asOf,
      siteHost: new URL(resultUrl).host,
    });
    const filename = `우리동네세계지도-${resultLabel}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${resultLabel} | 우리동네 세계지도`, text: resultText(), url: resultUrl, files: [file] });
      } else {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }

    setCardShared(true);
    if (cardTimer.current) clearTimeout(cardTimer.current);
    cardTimer.current = setTimeout(() => setCardShared(false), 1800);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={resetMap} aria-label="우리동네 세계지도 홈">
          <span className="brand__mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>우리동네 세계지도</strong><small>PUBLIC DATA EXPLORER</small></span>
        </button>
        <div className="topbar__actions">
          <span className="date-badge">{data.meta.asOf.slice(0, 7).replace("-", ".")} 기준</span>
          <button className="icon-button" type="button" onClick={() => setInfoOpen(true)} aria-label="데이터 안내"><InfoIcon /></button>
        </div>
      </header>

      <section className="workspace" id="top">
        <aside className="control-panel">
          <div className="eyebrow-row">
            <span className="eyebrow">법무부 공개 통계</span>
            <span className="privacy-chip">개인 주소 없음</span>
          </div>
          <h1>우리 동네를 검색했더니<br /><em>세계지도가 나왔다.</em></h1>
          <p className="intro-copy">체감과 실제 통계는 얼마나 같을까요? 동네 이름 하나로 지역 인구 100명당 중국·한국계 중국인 등록외국인 수를 확인해 보세요.</p>

          <form className="search-wrap" onSubmit={handleSearchSubmit}>
            <SearchIcon />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="예: 영등포구, 시흥시, 제주"
              aria-label="내 동네 검색"
              autoComplete="off"
            />
            <button className="sr-only" type="submit">첫 번째 검색 결과 열기</button>
            {searchResults.length > 0 && (
              <div className="search-results" aria-label="지역 검색 결과">
                {searchResults.map(({ province, district }) => (
                  <button key={`${province.name}-${district?.name ?? "all"}`} type="button" onClick={() => openResult(province, district)}>
                    <span>{district?.name ?? province.name}</span><small>{district ? province.shortName : "시도 전체"}</small>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div className="search-empty" role="status">검색 결과가 없습니다. 시·군·구 이름으로 찾아보세요.</div>
            )}
          </form>

          <div className="quick-regions" aria-label="바로 보기 지역">
            <span>100명당 비율이 높은 지역</span>
            {quickRegions.map(({ province, district }) => (
              <button key={`${province.name}-${district.name}`} type="button" onClick={() => openResult(province, district)}>{district.name}</button>
            ))}
          </div>

          <button className="random-button" type="button" onClick={openRandomDistrict}><ShuffleIcon /> 아무 동네나 열어보기</button>

          {featuredJeju && (
            <button className="featured-check" type="button" onClick={() => openResult(featuredJeju)}>
              <span className="featured-check__eyebrow">먼저 확인해보기</span>
              <strong>제주, 100명당 몇 명일까?</strong>
              <span className="featured-check__action">공개통계 결과 열기 <b>→</b></span>
            </button>
          )}

          <div className="national-snapshot">
            <span>전국 지역 인구 100명당 평균</span>
            <strong>{formatPer100(nationalRate)}<small>명</small></strong>
            <p>중국·한국계 중국인 등록외국인 {numberFormat.format(data.national[PRIMARY_METRIC])}명</p>
          </div>

          <div className="trust-note"><InfoIcon /><p>개인을 추적하는 지도가 아닙니다. 공개된 시군구 합계만 보여주며 주소·이동·범죄정보는 포함하지 않습니다.</p></div>
        </aside>

        <section className="map-panel" aria-label="지역 인구 대비 중국·한국계 중국인 등록외국인 지도">
          <div className="map-toolbar">
            <div className="breadcrumb">
              {selectedProvince ? <><button type="button" onClick={resetMap}>전국</button><span>/</span><strong>{selectedProvince.name}</strong></> : <strong>전국 17개 시도</strong>}
            </div>
            <div className="map-legend"><b>지역 인구 100명당</b><span>낮음</span><i /><i /><i /><i /><span>높음</span></div>
          </div>

          <div className="map-stage">
            <SchematicMap
              provinces={data.provinces}
              selectedProvince={selectedProvince}
              onSelectProvince={(province) => openResult(province)}
              onSelectDistrict={(province, district) => openResult(province, district)}
            />
            {naverClientId && (
              <NaverResidentMap
                clientId={naverClientId}
                provinces={data.provinces}
                selectedProvince={selectedProvince}
                onSelectProvince={(province) => openResult(province)}
                onSelectDistrict={(province, district) => openResult(province, district)}
              />
            )}
            {!selectedProvince && !selection && (
              <div className="map-top-list">
                <span>100명당 전국 상위</span>
                {nationwideTop.map((province, index) => (
                  <button key={province.name} type="button" onClick={() => openResult(province)}>
                    <b>{index + 1}</b>{province.shortName}<strong>{formatPer100(rateFor(province))}명</strong>
                  </button>
                ))}
              </div>
            )}

            {selection && resultEntity && resultRank && (
              <section className="result-card" id="result" aria-live="polite" aria-busy={revealing}>
                {revealing ? (
                  <div className="result-reveal">
                    <span className="result-reveal__pin" aria-hidden="true"><i /></span>
                    <strong>{resultLabel} 공개 통계 찾는 중</strong>
                    <p>지역 비교 · 순위 계산 · 출처 확인</p>
                    <div className="result-reveal__bar"><i style={{ animationDuration: `${revealDuration}ms` }} /></div>
                  </div>
                ) : (
                  <>
                    <div className="result-card__head">
                      <div><span>MY NEIGHBORHOOD RESULT</span><strong>{selection.province.shortName}{selection.district ? ` · ${selection.district.name}` : ""}</strong></div>
                      <button type="button" onClick={closeResult} aria-label="결과 닫기">×</button>
                    </div>
                    <p className="result-card__question">{resultLabel} 지역 인구 100명 중<br />중국·한국계 중국인 등록외국인은</p>
                    <div className="result-card__number"><strong>{formatPer100(resultRate)}</strong><span>명</span></div>
                    <p className="result-insight"><span>체감 vs 통계</span>{comparisonText}</p>
                    <div className="result-metrics">
                      <article><span>실제 등록 인원</span><strong>{numberFormat.format(resultValue)}<small>명</small></strong></article>
                      <article><span>비율 기준 {resultRank.scope} 순위</span><strong>{resultRank.rank}<small> / {resultRank.total}위</small></strong></article>
                      <article><span>전국 100명당 평균</span><strong>{formatPer100(nationalRate)}<small>명</small></strong></article>
                    </div>
                    <div className="share-actions">
                      <button className="share-x" type="button" onClick={shareToX}><span aria-hidden="true">𝕏</span> 결과 공유</button>
                      <button className="share-copy" type="button" onClick={shareOrCopy}>{copied ? <><span>✓</span> 복사됨</> : <><CopyIcon /> 링크 복사</>}</button>
                      <button className="share-card" type="button" onClick={shareResultCard}>{cardShared ? <><span>✓</span> 카드 준비됨</> : <><CardIcon /> 이미지 카드 공유</>}</button>
                    </div>
                    <button className="try-another" type="button" onClick={searchAnotherNeighborhood}>친구 동네는 몇 위인지 확인하기 →</button>
                    <p className="result-card__note">지역 인구는 주민등록인구와 등록외국인을 합친 값입니다. 입국자·불법체류자·범죄 통계가 아니며, 원자료의 ‘중국’과 ‘한국계 중국인’을 합산했습니다. {data.meta.asOf} 기준.</p>
                  </>
                )}
              </section>
            )}
          </div>
        </section>
      </section>

      <footer className="source-footer"><span>{data.meta.provider} 등록외국인 · {data.meta.populationProvider} 주민등록인구</span><span className="source-footer__links"><a href={data.meta.sourcePage} target="_blank" rel="noreferrer">법무부 원문 ↗</a><a href={data.meta.populationSourcePage} target="_blank" rel="noreferrer">인구 원문 ↗</a></span></footer>

      {infoOpen && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setInfoOpen(false)}>
          <section className="info-sheet" role="dialog" aria-modal="true" aria-labelledby="info-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header"><div><span>DATA &amp; PRIVACY</span><h2 id="info-title">이 지도를 읽는 법</h2></div><button type="button" onClick={() => setInfoOpen(false)} aria-label="닫기">×</button></div>
            <div className="info-sheet__hero"><strong>{data.meta.asOf}</strong><span>통계 기준일</span></div>
            <ul>{data.meta.notes.map((note) => <li key={note}>{note}</li>)}</ul>
            <div className="info-sheet__links"><a href={data.meta.dataGoKrDataset} target="_blank" rel="noreferrer">법무부 공공데이터포털 데이터셋</a><a href={data.meta.sourcePage} target="_blank" rel="noreferrer">법무부 등록외국인 통계 원문</a><a href={data.meta.populationSourcePage} target="_blank" rel="noreferrer">행정안전부 주민등록인구 원문</a></div>
          </section>
        </div>
      )}
    </main>
  );
}
