# 작업 006 인수인계 — 우리동네 세계지도 운영 고도화

최종 확인일: 2026-08-25

## 0. Codex 시작 지시

아래 GitHub 저장소의 `main`을 기준으로 작업을 이어간다. 프로젝트를 새로 만들거나 다른 배포 경로로 교체하지 않는다.

- 저장소: `https://github.com/yongdal2096-debug/foreign-resident-map`
- 운영 주소: `https://uridongne-map.pages.dev/`
- 배포 흐름: GitHub `main` 수정 → Cloudflare Pages 자동 빌드·배포
- 우선 작업: 운영 네이버 지도에서 수도권·중부권 마커가 겹치는 문제를 줄이고 데스크톱·모바일 가독성을 검수한다.

## 1. 프로젝트 목적과 표현 원칙

법무부 출입국·외국인정책본부와 행정안전부 공개통계를 활용해 전국 시도·시군구별 중국·한국계 중국인 등록외국인 현황을 보여주는 공개통계 웹 지도다.

핵심 사용자 흐름은 다음과 같다.

1. 동네 검색 또는 지도 선택
2. 결과 공개 연출
3. 실제 인원·지역 인구 100명당 비율·순위 확인
4. X·링크·이미지 카드 공유
5. 다른 동네 재검색

반드시 지킬 표현 원칙:

- 개인 주소·위치·이동 정보를 사용하지 않는다.
- 미등록 체류자 수, 범죄율 또는 지역 위험도를 나타내는 것처럼 표현하지 않는다.
- 국적과 범죄·치안 문제를 인과적으로 연결하지 않는다.
- 자극적 혐오 표현보다 중립적인 공공통계 탐색 서비스로 유지한다.

## 2. 기준 저장소와 배포 구조

| 항목 | 현재 기준 |
| --- | --- |
| GitHub | `yongdal2096-debug/foreign-resident-map` |
| 운영 브랜치 | `main` |
| Cloudflare 서비스 | Pages |
| Pages 프로젝트 | `uridongne-map` |
| 운영 URL | `https://uridongne-map.pages.dev/` |
| 프레임워크 | Next.js 정적 내보내기 |
| 빌드 명령 | `npx next build` |
| 출력 폴더 | `out` |
| Node | 22 이상 |

Cloudflare 대시보드에는 이름이 같은 두 항목이 보인다.

- `uridongne-map.pages.dev`: 실제 운영 Pages 프로젝트. 이 항목을 사용한다.
- `uridongne-map.yongdal2096.workers.dev`: 별도 Workers 항목. 운영 Pages 설정과 혼동하지 않는다.

기존 ChatGPT Sites 배포는 백업으로 유지한다. 임의로 삭제하거나 주소·접근 설정을 변경하지 않는다.

- 기존 Sites slug: `foreign-resident-map`
- 기존 Sites URL: `https://foreign-resident-map.yongdal2096.chatgpt.site`

## 3. 네이버 지도 설정

코드는 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`가 존재하면 실제 네이버 지도를, 없으면 좌표 기반 대체 지도를 렌더링한다.

현재 완료된 설정:

- Cloudflare Pages Production 환경에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 등록 완료
- NAVER Cloud Maps 애플리케이션에 운영 도메인 등록 완료
- Web Dynamic Map 사용
- 시군구 주소 좌표 변환을 위해 Geocoding 사용

보안 원칙:

- 실제 Client ID 값과 Client Secret을 GitHub 문서·코드·커밋에 넣지 않는다.
- `.env.example`에는 변수 이름만 유지한다.
- Client Secret은 현재 프런트엔드 지도 코드에 필요하지 않다.

환경변수 변경 후에는 기존 산출물에 자동 반영되지 않을 수 있으므로 `main` 커밋 또는 Cloudflare 재배포로 새 빌드를 실행한다.

## 4. 현재 운영 검증 상태

현재 `main` 기준 커밋:

- `a8a82b213f3a5ba3bd01bac13a8aec4ca9526c17`
- 메시지: `chore: rebuild Pages with map configuration`

직전 기능 수정:

- `f46b0f8537da0e653035f3d86ecf20a88e4b09ff`
- 메시지: `fix: prevent province markers from overlapping`

최종 운영 검수 결과:

- 운영 루트에서 네이버 지도 SDK 로드 성공
- `.naver-map-wrap--ready` 확인
- 전국 시도 네이버 지도 마커 17개 확인
- 서울 마커 클릭 후 결과 카드 정상 표시
- 서울 상세 화면 시군구 마커 25개 확인
- 지도 연결 오류 안내 없음
- 브라우저 페이지 오류 없음
- GitHub CI 성공: `https://github.com/yongdal2096-debug/foreign-resident-map/actions/runs/32856348297`

## 5. 데이터와 대표 지표

기본 스냅샷:

- 법무부 2026년 6월 등록외국인 지역별 현황
- 행정안전부 2026년 6월 주민등록인구

핵심 합계:

- 전국 등록외국인: 1,636,922명
- 중국: 221,073명
- 한국계 중국인: 214,818명
- 중국 + 한국계 중국인: 435,891명
- 주민등록인구 + 등록외국인: 52,728,691명

대표 지표:

```text
(중국 + 한국계 중국인 등록외국인)
÷ (주민등록인구 + 등록외국인)
× 100
```

- 전국 평균: 지역 인구 100명당 0.83명
- 제주: 1.55명, 17개 시도 중 1위

국적별 표와 체류자격별 표는 서로 다른 주변합이다. `중국 국적 × D-2/E-9` 같은 교차값을 근거 없이 추정하지 않는다.

## 6. 주요 기능

- 전국 17개 시도 지도 선택
- 시군구 검색 및 자동완성
- 바로 보기 지역 버튼
- 무작위 동네 선택
- 제주 첫 진입 훅
- 결과 공개 애니메이션
- 실제 등록 인원, 비율 순위, 전국 평균 표시
- X 공유
- 링크 복사
- 이미지 결과 카드 생성·공유
- URL 쿼리를 통한 결과 복원
- 데이터 출처·개인정보 비사용 안내
- 네이버 지도 연결 실패 시 좌표 기반 대체 지도

## 7. 코드 위치

| 파일 | 역할 |
| --- | --- |
| `app/page.tsx` | 데이터와 지도 Client ID를 대시보드에 전달 |
| `app/ResidentDashboard.tsx` | 검색·선택·결과·공유·대체 지도 전체 흐름 |
| `app/NaverResidentMap.tsx` | 네이버 SDK 로드, 시도 마커, 시군구 지오코딩 |
| `app/globals.css` | 전체 UI, 지도 마커, 반응형 스타일 |
| `app/data/residents.json` | 공개통계 스냅샷 |
| `tests/data-integrity.test.mjs` | 합계·공식·순위 데이터 검증 |
| `next.config.ts` | `output: "export"`, `trailingSlash: true` |
| `wrangler.jsonc` | `out` 정적 자산 배포 설정 |
| `.github/workflows/ci.yml` | `npm ci` → 테스트 → 정적 빌드 |

## 8. 완료된 개선

- Cloudflare Pages 운영 주소로 이전
- 기존 축약 정적 화면을 전체 검색·결과·공유 경험으로 복구
- 대표 지표를 지역 전체 인구 대비 비율로 통일
- 대체 지도 전국 마커를 충돌 방지 배치로 변경
- 대체 지도 마커 최대 크기·후광·흐림 축소
- 대체 지도 제주 잘림 해결
- 모바일 대체 지도 전용 배치 추가
- 네이버 지도 환경변수 연결 및 실제 운영 로드 확인
- GitHub Actions CI 구성과 성공 확인

## 9. 남은 우선 작업

### P0 — 실제 네이버 지도 마커 가독성

실제 네이버 지도는 정상 출력되지만 전국 축척에서 서울·인천·경기 및 충청권의 64px 원형 마커가 서로 겹친다. 대체 지도 충돌은 해결됐지만 네이버 지도 마커는 별도 구현이므로 추가 개선이 필요하다.

권장 방향:

1. 전국 화면에서는 작은 점 또는 핀을 사용하고 이름·비율은 hover/focus/click 툴팁으로 표시
2. 또는 충돌 감지·클러스터·지도 확대 수준별 마커 크기 조절 적용
3. 정확한 지리 위치를 크게 왜곡하는 임의 좌표 이동은 마지막 수단으로 사용
4. 제주를 포함하면서 한반도가 화면을 충분히 채우도록 초기 중심·줌 또는 bounds 조정

완료 기준:

- 전국 마커 17개가 클릭 가능
- 주요 수도권 마커 라벨이 서로 가리지 않음
- 제주가 초기 화면에 표시됨
- 상위 3개 요약 바와 줌 컨트롤을 가리지 않음
- 데스크톱과 390px 모바일에서 검수 완료

### P1 — 운영 인터랙션 회귀 검수

- 영등포구 검색 → 결과 공개 → 순위·인원 확인
- 네이버 지도 시도 마커 → 시군구 지도 전환
- X·링크·이미지 카드 공유
- URL로 결과 직접 진입 후 상태 복원
- 결과 닫기·전국 복귀·다른 동네 검색

### P2 — 안정성과 성능

- 네이버 SDK 또는 Geocoding 실패 시 대체 화면 전환 검수
- 시군구 Geocoding 요청량과 세션 캐시 동작 확인
- 지도 SDK와 이미지 카드가 초기 로딩 성능에 미치는 영향 측정
- OG 이미지와 모바일 공유 미리보기 확인

## 10. 검증 명령

```bash
npm ci
npm test
npm run build
```

현재 데이터 테스트는 5개이며 모두 통과해야 한다. 정적 빌드는 `out/`을 생성해야 한다.

## 11. 권장 작업 절차

1. 저장소를 새로 clone하고 `main` 최신 상태를 기준으로 한다.
2. 기존 작업 트리와 비밀값을 먼저 확인하되 값을 출력하거나 커밋하지 않는다.
3. 수정 전 운영 문제를 재현한다.
4. 필요한 파일만 최소 수정한다.
5. `npm test`와 `npm run build`를 통과시킨다.
6. 실제 브라우저에서 데스크톱·모바일을 검수한다.
7. 정리된 커밋을 `main`에 반영한다.
8. GitHub CI 성공을 확인한다.
9. Cloudflare 자동배포 후 `https://uridongne-map.pages.dev/`를 다시 검수한다.

## 12. GitHub·보안 규칙

- 코딩 산출물은 `yongdal2096-debug` GitHub 계정에 체계적으로 누적한다.
- 프로젝트별 README, 실행법, 데이터 출처, 검증 결과를 유지한다.
- 군 내부정보, 개인정보, 인증키, API 키, Client Secret을 업로드하지 않는다.
- 사용자와 무관한 파일이나 기존 변경을 임의로 삭제하지 않는다.
- 운영 변경은 GitHub `main` → Cloudflare Pages 자동배포 구조를 유지한다.

## 13. 새 Codex 작업창 시작 문구

```text
작업 006 인수인계 문서 기준으로 계속 진행해줘.

저장소: https://github.com/yongdal2096-debug/foreign-resident-map
인수인계: docs/HANDOFF_006.md
운영 사이트: https://uridongne-map.pages.dev/

GitHub main → Cloudflare Pages 자동배포 구조와 기존 Sites 백업을 유지해.
먼저 운영 네이버 지도에서 수도권·충청권 마커가 겹치는 문제를 재현하고,
정확한 위치·클릭 가능성·제주 노출을 유지하면서 가독성을 개선해줘.
수정 후 테스트·정적 빌드·CI·Cloudflare 운영 화면까지 직접 검수해.
API 키·Client ID 실제 값·개인정보·군 내부정보는 GitHub에 올리지 마.
```
