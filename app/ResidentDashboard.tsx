"use client";

import { useMemo, useState } from "react";
import NaverResidentMap from "./NaverResidentMap";

export type MetricKey =
  | "chinaCombined"
  | "china"
  | "koreanChinese"
  | "studentD2"
  | "workerE9";
type UnitKey = "count" | "share";

export interface Counts {
  total: number;
  china: number;
  koreanChinese: number;
  chinaCombined: number;
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

const METRICS: Array<{
  key: MetricKey;
  label: string;
  shortLabel: string;
  group: "nationality" | "visa";
  description: string;
}> = [
  {
    key: "chinaCombined",
    label: "중국 전체",
    shortLabel: "중국 전체",
    group: "nationality",
    description: "중국 + 한국계 중국인",
  },
  {
    key: "china",
    label: "중국",
    shortLabel: "중국",
    group: "nationality",
    description: "원자료의 ‘중국’ 열",
  },
  {
    key: "koreanChinese",
    label: "한국계 중국인",
    shortLabel: "한국계 중국인",
    group: "nationality",
    description: "원자료의 별도 국적 분류",
  },
  {
    key: "studentD2",
    label: "유학 D-2",
    shortLabel: "D-2 유학",
    group: "visa",
    description: "국적 구분 없는 전체 등록외국인",
  },
  {
    key: "workerE9",
    label: "비전문취업 E-9",
    shortLabel: "E-9 취업",
    group: "visa",
    description: "국적 구분 없는 전체 등록외국인",
  },
];

const numberFormat = new Intl.NumberFormat("ko-KR");

function compactNumber(value: number) {
  if (value >= 10000) {
    const scaled = value / 10000;
    return `${scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}만`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천`;
  return numberFormat.format(value);
}

function formatValue(entity: Counts, metric: MetricKey, unit: UnitKey) {
  const value = entity[metric];
  if (unit === "share") {
    return entity.total ? `${((value / entity.total) * 100).toFixed(1)}%` : "0.0%";
  }
  return numberFormat.format(value);
}

function MetricIcon({ metric }: { metric: MetricKey }) {
  if (metric === "studentD2") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 9 9-5 9 5-9 5-9-5Zm4 3.2V17c2.8 2.2 7.2 2.2 10 0v-4.8" />
      </svg>
    );
  }
  if (metric === "workerE9") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h16v11H4V8Zm5 0V5h6v3M4 13h16M10 13v2h4v-2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c.7-4 3.1-6 7-6s6.3 2 7 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" />
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

function SchematicMap({
  provinces,
  selectedProvince,
  metric,
  unit,
  onSelectProvince,
}: {
  provinces: Province[];
  selectedProvince: Province | null;
  metric: MetricKey;
  unit: UnitKey;
  onSelectProvince: (province: Province) => void;
}) {
  const points: Array<{
    id: string;
    label: string;
    entity: Counts;
    lat: number;
    lng: number;
    province?: Province;
  }> = selectedProvince
    ? selectedProvince.districts
        .filter((district) => district.lat !== null && district.lng !== null)
        .map((district) => ({
          id: district.name,
          label: district.name,
          entity: district,
          lat: district.lat as number,
          lng: district.lng as number,
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
    return (
      <div className="rank-map" role="img" aria-label={`${selectedProvince.name} 시군구 순위 지도 대체 화면`}>
        <div className="rank-map__glow" />
        <div className="rank-map__title">
          <span>{selectedProvince.shortName}</span>
          <strong>시군구 밀집 순위</strong>
          <p>지도 키 연결 전에는 정확한 좌표 대신 순위를 제공합니다.</p>
        </div>
        <div className="rank-map__rows">
          {selectedProvince.districts.slice(0, 5).map((district, index) => (
            <div className="rank-map__row" key={district.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{district.name}</strong>
              <b>{formatValue(district, metric, unit)}</b>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const values = points.map((point) => point.entity[metric]);
  const maxValue = Math.max(...values, 1);
  const bounds = selectedProvince
    ? { minLng: 126.42, maxLng: 126.7, minLat: 33.17, maxLat: 33.57 }
    : { minLng: 125.9, maxLng: 129.65, minLat: 33.1, maxLat: 38.35 };

  return (
    <div
      className={`schematic-map ${selectedProvince ? "schematic-map--local" : ""}`}
      role="img"
      aria-label={selectedProvince ? `${selectedProvince.name} 밀집도 개략 지도` : "전국 시도별 밀집도 개략 지도"}
    >
      <div className="schematic-map__grid" />
      <div className="schematic-map__axis schematic-map__axis--north">N</div>
      <div className="schematic-map__caption">좌표 기반 개략도</div>
      {points.map((point) => {
        const x = ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
        const y = ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * 100;
        const intensity = Math.sqrt(point.entity[metric] / maxValue);
        const size = 46 + intensity * 56;
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
            onClick={() => point.province && onSelectProvince(point.province)}
            aria-label={`${point.label} ${formatValue(point.entity, metric, unit)}`}
          >
            <span>{point.label}</span>
            <strong>
              {unit === "count"
                ? compactNumber(point.entity[metric])
                : formatValue(point.entity, metric, unit)}
            </strong>
          </button>
        );
      })}
    </div>
  );
}

export default function ResidentDashboard({ data, naverClientId }: DashboardProps) {
  const [metric, setMetric] = useState<MetricKey>("chinaCombined");
  const [unit, setUnit] = useState<UnitKey>("count");
  const [selectedProvinceName, setSelectedProvinceName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const selectedProvince =
    data.provinces.find((province) => province.name === selectedProvinceName) ?? null;
  const metricInfo = METRICS.find((option) => option.key === metric) ?? METRICS[0];
  const ranking = useMemo(() => {
    const entities = selectedProvince ? selectedProvince.districts : data.provinces;
    return [...entities].sort((a, b) => b[metric] - a[metric]);
  }, [data.provinces, metric, selectedProvince]);
  const nationalShare = (data.national[metric] / data.national.total) * 100;
  const jeju = data.provinces.find((province) => province.shortName === "제주") as Province;

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const results: Array<{ province: Province; district?: District }> = [];
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
    return results.slice(0, 6);
  }, [data.provinces, searchQuery]);

  function chooseSearchResult(province: Province) {
    setSelectedProvinceName(province.name);
    setSearchQuery("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="우리동네 세계지도 홈">
          <span className="brand__mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>우리동네 세계지도</strong><small>FOREIGN RESIDENT ATLAS</small></span>
        </a>
        <div className="topbar__actions">
          <span className="date-badge">{data.meta.asOf.slice(0, 7).replace("-", ".")} 기준</span>
          <button className="icon-button" type="button" onClick={() => setInfoOpen(true)} aria-label="데이터 안내"><InfoIcon /></button>
        </div>
      </header>

      <section className="workspace" id="top">
        <aside className="control-panel">
          <div className="eyebrow-row">
            <span className="eyebrow">법무부 공개 통계</span>
            <span className="status-dot"><i /> 최신 월보</span>
          </div>
          <h1>숫자로 보는<br />국내 외국인 체류 분포</h1>
          <p className="intro-copy">지역별 등록외국인 현황을 같은 기준으로 비교하고, 밀집 지역의 규모와 비중을 확인합니다.</p>

          <div className="search-wrap">
            <SearchIcon />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="시도·시군구 검색" aria-label="지역 검색" />
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(({ province, district }) => (
                  <button key={`${province.name}-${district?.name ?? "all"}`} type="button" onClick={() => chooseSearchResult(province)}>
                    <span>{district?.name ?? province.name}</span><small>{district ? province.shortName : "시도 전체"}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="quick-actions">
            <button className="filter-button" type="button" onClick={() => setFilterOpen(true)}><FilterIcon />필터<span>1</span></button>
            <div className="segmented" aria-label="표시 단위">
              <button className={unit === "count" ? "active" : ""} type="button" onClick={() => setUnit("count")}>인원</button>
              <button className={unit === "share" ? "active" : ""} type="button" onClick={() => setUnit("share")}>비중</button>
            </div>
          </div>

          <div className="current-filter">
            <span className={`metric-glyph metric-glyph--${metricInfo.group}`}><MetricIcon metric={metric} /></span>
            <div><small>현재 지표</small><strong>{metricInfo.shortLabel}</strong><p>{metricInfo.description}</p></div>
            <button type="button" onClick={() => setFilterOpen(true)} aria-label="지표 변경">변경</button>
          </div>

          <div className="summary-grid">
            <article><span>전국</span><strong>{compactNumber(data.national[metric])}<small>명</small></strong><p>등록외국인 중 {nationalShare.toFixed(1)}%</p></article>
            <article className="summary-grid__jeju"><span>제주</span><strong>{compactNumber(jeju[metric])}<small>명</small></strong><button type="button" onClick={() => setSelectedProvinceName(jeju.name)}>집중 보기 →</button></article>
          </div>

          <div className="scope-note"><InfoIcon /><p><strong>해석 주의</strong> 등록외국인 분포이며, 불법체류자나 범죄율을 나타내지 않습니다.</p></div>
        </aside>

        <section className="map-panel" aria-label="체류 현황 지도">
          <div className="map-toolbar">
            <div className="breadcrumb">
              {selectedProvince ? <><button type="button" onClick={() => setSelectedProvinceName(null)}>전국</button><span>/</span><strong>{selectedProvince.name}</strong></> : <strong>전국 17개 시도</strong>}
            </div>
            <div className="map-legend"><span>낮음</span><i /><i /><i /><i /><span>높음</span></div>
          </div>

          <div className="map-stage">
            {naverClientId ? (
              <NaverResidentMap
                clientId={naverClientId}
                provinces={data.provinces}
                selectedProvince={selectedProvince}
                metric={metric}
                onSelectProvince={(province) => setSelectedProvinceName(province.name)}
              />
            ) : (
              <>
                <SchematicMap provinces={data.provinces} selectedProvince={selectedProvince} metric={metric} unit={unit} onSelectProvince={(province) => setSelectedProvinceName(province.name)} />
                <div className="map-mode-badge"><span>DEMO</span>네이버 지도 키 연결 전 개략도</div>
              </>
            )}
          </div>

          <div className="ranking-dock">
            <div className="ranking-dock__title"><span>현재 화면 TOP 3</span><strong>{selectedProvince ? selectedProvince.shortName : "전국"} · {metricInfo.shortLabel}</strong></div>
            <div className="ranking-dock__items">
              {ranking.slice(0, 3).map((entity, index) => (
                <article key={entity.name}>
                  <span className="rank-number">0{index + 1}</span>
                  <div><strong>{entity.name}</strong><small>{metricInfo.group === "visa" ? "전체 등록외국인 기준" : `전체 등록외국인 중 ${formatValue(entity, metric, "share")}`}</small></div>
                  <b>{formatValue(entity, metric, unit)}{unit === "count" && <small>명</small>}</b>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>

      <footer className="source-footer"><span>DATA NOTE · {data.meta.dataset}</span><a href={data.meta.sourcePage} target="_blank" rel="noreferrer">법무부 원문 보기 ↗</a></footer>

      {filterOpen && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setFilterOpen(false)}>
          <section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header"><div><span>DATA LAYER</span><h2 id="filter-title">데이터 필터</h2></div><button type="button" onClick={() => setFilterOpen(false)} aria-label="닫기">×</button></div>
            <div className="filter-group">
              <div className="filter-group__heading"><div><span className="metric-glyph metric-glyph--nationality"><MetricIcon metric="chinaCombined" /></span></div><div><strong>국적 분포</strong><small>국적×시군구 교차 통계</small></div></div>
              <div className="choice-list">
                {METRICS.filter((option) => option.group === "nationality").map((option) => (
                  <button className={metric === option.key ? "selected" : ""} type="button" key={option.key} onClick={() => setMetric(option.key)}><span><strong>{option.label}</strong><small>{option.description}</small></span><i /></button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-group__heading"><div><span className="metric-glyph metric-glyph--visa"><MetricIcon metric="studentD2" /></span></div><div><strong>체류자격 분포</strong><small>전체 등록외국인 기준 · 국적 교차 불가</small></div></div>
              <div className="choice-list">
                {METRICS.filter((option) => option.group === "visa").map((option) => (
                  <button className={metric === option.key ? "selected" : ""} type="button" key={option.key} onClick={() => setMetric(option.key)}><span><strong>{option.label}</strong><small>{option.description}</small></span><i /></button>
                ))}
              </div>
            </div>
            <div className="sheet-warning"><InfoIcon />서로 다른 표의 주변합을 결합해 “중국인 D-2/E-9”로 추정하지 않습니다.</div>
            <button className="apply-button" type="button" onClick={() => setFilterOpen(false)}>필터 적용하기</button>
          </section>
        </div>
      )}

      {infoOpen && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setInfoOpen(false)}>
          <section className="info-sheet" role="dialog" aria-modal="true" aria-labelledby="info-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-header"><div><span>METHODOLOGY</span><h2 id="info-title">데이터를 읽는 법</h2></div><button type="button" onClick={() => setInfoOpen(false)} aria-label="닫기">×</button></div>
            <div className="info-sheet__hero"><strong>{data.meta.asOf}</strong><span>기준일</span></div>
            <ul>{data.meta.notes.map((note) => <li key={note}>{note}</li>)}</ul>
            <div className="info-sheet__links"><a href={data.meta.dataGoKrDataset} target="_blank" rel="noreferrer">공공데이터포털 데이터셋</a><a href={data.meta.sourcePage} target="_blank" rel="noreferrer">최신 통계월보 원문</a></div>
          </section>
        </div>
      )}
    </main>
  );
}
