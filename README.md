# TraceAgent

> AI 에이전트의 실행 과정을 추적하고 오류 원인을 분석하는 AI 블랙박스
> **"보이지 않는 AI의 실행 흐름을, 명확하게 추적합니다."**

TraceAgent는 AI 에이전트의 실행 과정에서 발생하는 Tool Call, 검색, API 호출, 오류, 상태 변화를 실시간으로
기록하고, 실패 지점을 AI가 분석하여 원인과 개선안을 제시한 뒤 수정 후 재실행 결과까지 비교·검증할 수 있는
**AI Agent Observability & Debugging Platform**입니다.

핵심 플로우: **실행 흐름 기록 → 오류 감지 → Root Cause Analysis → Recommended Fix → Fix & Replay → 전후 비교**

> TraceAgent는 모델의 비공개 chain-of-thought를 읽거나 노출하지 않습니다. 추적·분석 대상은 항상 관측
> 가능한 실행 데이터(User Request, Plan 요약, Tool Call, Tool Input/Output, 검색 메타데이터, API 응답,
> 오류 메시지, 실행 시간, 상태 변화)로 한정됩니다.

---

## 1. 기술 스택

- **Next.js 15** (App Router) + **TypeScript** (strict) + **React 18**
- **Tailwind CSS** — Dark mode 고정 Glassmorphism SaaS 디자인
- **Vercel AI SDK** (`ai`, `@ai-sdk/openai`) — Plan / Root Cause Analysis / 최종 답변 생성
- **OpenAI API** — Plan 단계, Root Cause Analysis, Result 단계의 실제 답변 생성 (키 미설정 시 mock으로 자동 대체)
- **Tavily Search API** — Search / Tool Call 단계의 실제 웹 검색 + 페이지 콘텐츠 추출 (키 미설정 시 시뮬레이션으로 자동 대체)
- **Supabase** (`@supabase/supabase-js`) — 실행 기록 영속화 (미설정 시 in-memory store로 자동 대체)
- **Zod** — API 요청/응답 스키마 검증
- **recharts** — Analytics 차트, **lucide-react** — 아이콘

### 실제 에이전트 모드 vs 시뮬레이션 모드

TraceAgent는 **두 가지 모드로 동작**하며, `TAVILY_API_KEY` 설정 여부로 자동 전환됩니다 (`/settings`에서 확인 가능).

- **실제 에이전트 모드** (`TAVILY_API_KEY` 설정 시): Search 단계는 Tavily Search API로 실제 웹 검색을 수행하고,
  Tool Call 단계는 Tavily Extract API로 검색된 페이지의 실제 콘텐츠를 가져옵니다. Demo Scenario 선택기로
  고른 오류(Auth Error / Outdated Source / Tool Timeout)는 **실제 API 호출을 의도적으로 잘못된 조건으로
  실행**해서(잘못된 키, 극단적으로 짧은 timeout, 엄격한 신선도 임계값) 진짜 API 응답으로 오류를 재현합니다
  — 즉, 오류 메시지는 스크립트가 아니라 실제 Tavily 응답입니다. Fix & Replay 시에는 정상 조건(올바른 키,
  충분한 timeout, 실제 운영 기준 임계값)으로 동일한 실제 API를 다시 호출해 진짜로 성공시킵니다.
- **시뮬레이션 모드** (`TAVILY_API_KEY` 미설정 시): 원래 해커톤 데모용으로 설계된 완전 결정론적 mock
  파이프라인으로 동작합니다. 외부 API 키 없이도 `npm install && npm run dev`만으로 전체 플로우를 즉시
  체험할 수 있습니다.

두 모드 모두 Plan 단계(작업 계획 요약)와 Result 단계(최종 답변), 그리고 Root Cause Analysis는
`OPENAI_API_KEY` 유무에 따라 각각 실제 GPT-4o-mini 생성 ↔ mock 템플릿으로 독립적으로 전환됩니다 —
즉 Tavily만 설정해도, OpenAI만 설정해도, 설정한 만큼만 실제로 동작합니다.

> **LangChain 관련 노트**: 요구 스택에 LangChain이 포함되어 있으나, Tool 이름/입출력/에러를 갖는 파이프라인
> 구조(`src/lib/agent/demoAgent.ts`) 자체를 LangChain의 Tool 추상화와 동일한 형태로 직접 구현했습니다.
> 실제 AI 추론이 필요한 지점(Plan, Root Cause Analysis, 최종 답변)은 모두 Vercel AI SDK + OpenAI로
> 구현되어 있고, 실제 외부 도구 호출(Search/Tool Call)은 Tavily API로 구현되어 있습니다. 프로덕션에서
> 실제 LangChain 에이전트 프레임워크로 교체하려면 `runDemoAgent`의 시그니처(같은 `TraceEvent` 스트림을
> yield)만 유지한 채 내부 구현을 교체하면 됩니다.

---

## 2. 빠른 시작

```bash
npm install
cp .env.local.example .env.local   # 필요 시 키 입력 (비워둬도 mock/in-memory로 즉시 실행 가능)
npm run dev
```

<http://localhost:3000> 접속 → **Playground**에서 바로 데모 실행이 가능합니다.
환경변수를 하나도 설정하지 않아도 전체 플로우(실행 → 오류 감지 → 원인 분석 → Fix & Replay → 전후 비교)가
시뮬레이션 모드 + mock 분석기 + in-memory 저장소로 완전히 동작합니다. **해커톤 심사용으로 실제 동작을
보여주려면 최소 `TAVILY_API_KEY`(실제 검색/도구 호출)와 `OPENAI_API_KEY`(실제 AI 답변/분석)를 설정하세요.**

### 환경변수 (`.env.local`)

```env
# 서버에서만 사용되며 클라이언트에 절대 노출되지 않습니다.
OPENAI_API_KEY=
TAVILY_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

| 변수 | 비워두면 | 설정하면 |
|---|---|---|
| `TAVILY_API_KEY` | Search / Tool Call이 시뮬레이션(mock) 데이터로 동작 | 실제 Tavily Search + Extract API로 진짜 웹 검색·콘텐츠 추출 수행 |
| `OPENAI_API_KEY` | Plan/Result가 템플릿 mock, Root Cause 분석이 규칙 기반 mock | GPT-4o-mini로 실제 Plan 생성, 실제 답변 생성(`generateText`), 실제 Root Cause 분석(`generateObject`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 프로세스 메모리에 실행 기록 저장 (재시작 시 초기화) | Supabase Postgres에 영구 저장 |

Tavily API 키는 <https://tavily.com>에서 무료로 발급받을 수 있습니다 (무료 티어: 월 1,000회 호출).

`/settings` 페이지에서 현재 연결 상태(Tavily / OpenAI / Supabase)와 실제 에이전트 모드 여부를 실시간으로
확인할 수 있습니다.

---

## 3. Supabase 설정 (선택)

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/0001_init.sql` 실행
3. Project Settings → API에서 URL / anon key / service role key를 `.env.local`에 입력
4. 앱을 재시작하면 자동으로 Supabase 백엔드로 전환됩니다 (`/settings`에서 확인 가능)

테이블: `agent_runs`, `trace_events`, `failure_analyses`, `replays` (전체 스키마는 마이그레이션 파일 참고)

---

## 4. Vercel 배포

```bash
npm i -g vercel
vercel
```

또는 GitHub 저장소를 Vercel에 연결한 뒤, 프로젝트 설정 → Environment Variables에 위 5개 환경변수를
등록하면 됩니다. 환경변수를 등록하지 않아도 배포는 되며(시뮬레이션/mock/in-memory 모드), 해커톤 심사에서
**실제 에이전트 동작**을 보여주려면 최소 `TAVILY_API_KEY` + `OPENAI_API_KEY`를 등록하세요. Supabase는
인스턴스별로 격리된 in-memory 저장소를 사용하므로 서버리스 환경에서는 실제 데이터 영속성을 위해 Supabase
설정을 권장합니다.

---

## 5. 페이지 구조

| 경로 | 설명 |
|---|---|
| `/` | 랜딩 페이지 — 제품 소개, 실제 컴포넌트로 구성된 Mock Trace Dashboard |
| `/dashboard` | 전체 실행 현황 요약 (Total/Success/Fail/Success Rate + 최근 실행) |
| `/traces` | Agent 실행 기록 목록 |
| `/traces/[id]` | **개별 Trace 상세** — Timeline / Logs / Tool Calls / State / Artifacts 탭, Root Cause Analysis, Fix & Replay |
| `/playground` | **핵심 데모** — 사용자 요청 입력 → 시나리오 선택 → 실시간 실행 → 오류 감지 → 분석 → Fix & Replay → 전후 비교 |
| `/analytics` | 성공률, 오류 유형, 실행시간 통계 및 차트 |
| `/settings` | Supabase / OpenAI 연결 상태, 환경변수 안내 |

---

## 6. 데모 시나리오

Playground 상단의 **Demo Scenario** 선택기로 다음 4가지를 재현할 수 있습니다.

| 시나리오 | 실패 지점 | 에러 | 실제 에이전트 모드에서 |
|---|---|---|---|
| Normal Run | — | 모든 단계 정상 완료 | 실제 Tavily Search + Extract 성공 |
| API Authentication Error | Tool Call | `401 Unauthorized` (`AUTH_ERROR`) | 실제로 잘못된 키로 Tavily Extract 호출 → 진짜 401 응답 |
| Outdated Source Error | Tool Call (source validation) | `422` 소스 최신성 검증 실패 (`OUTDATED_SOURCE`) | 실제 추출 결과에 엄격한(데모용) 신선도 임계값 적용 → 검증 실패 |
| Tool Timeout | Tool Call | `504` 타임아웃 (`TIMEOUT_ERROR`) | 실제 Tavily Extract를 50ms 타임아웃으로 호출 → 진짜 타임아웃 |

`TAVILY_API_KEY`가 없으면 위 표의 "실제 에이전트 모드" 동작 대신 동일한 오류를 결정론적으로 재현하는
시뮬레이션으로 자동 대체됩니다 (심사 중 네트워크 문제로 데모가 끊기지 않도록 하는 안전장치).

기본 데모 스크립트 (해커톤 시연용, `auth_error` 시나리오가 기본 선택됨):

1. `"지난 6개월간 EV 시장 동향을 분석해줘."` 입력 후 **Run Agent**
2. `User Request ✓ → Plan ✓ → Search ✓ → Tool Call ✕ (401 Unauthorized)` 로 실패 감지
3. 우측 패널에 **Root Cause Analysis** (`External API authentication token이 만료...`, Risk: **HIGH**) 자동 표시
4. **Recommended Fix** + **Fix & Replay** 버튼 클릭
5. 동일 요청으로 재실행 → `User Request ✓ → Plan ✓ → Search ✓ → Tool Call ✓ → Result ✓`
6. **Replay Successful** — Errors `1 → 0`, Success Rate `0% → 100%`

---

## 7. 아키텍처 개요

```
src/
  app/
    page.tsx                     # 랜딩 페이지
    (app)/                       # 사이드바를 공유하는 제품 페이지 그룹
      dashboard/  traces/  traces/[id]/  playground/  analytics/  settings/
    api/
      runs/route.ts               # POST 실행 생성 + NDJSON 스트림, GET 목록
      runs/[id]/route.ts          # GET 상세 (run + events + analysis + replay)
      runs/[id]/analyze/route.ts  # POST Root Cause Analysis
      runs/[id]/replay/route.ts   # POST Fix & Replay (스트리밍)
      analytics/route.ts          # GET 통계
      settings/route.ts           # GET 연결 상태
  components/
    layout/   trace/   analytics/   common/
  lib/
    agent/demoAgent.ts           # 5단계 에이전트 엔진 (실제 모드 ↔ 시뮬레이션 모드 자동 전환)
    agent/runExecutor.ts         # NDJSON 스트리밍 실행기 (영속화 포함)
    ai/analyze.ts                # OpenAI 기반 Root Cause Analysis + mock fallback
    ai/generatePlan.ts           # OpenAI 기반 Plan 생성 + mock fallback
    ai/generateAnswer.ts         # OpenAI 기반 최종 답변 생성 + mock fallback
    tools/tavily.ts              # Tavily Search / Extract API 클라이언트
    db/store.ts                  # Supabase ↔ in-memory 통합 데이터 접근 계층
    analytics.ts                 # 통계 집계
  hooks/useRunStream.ts          # 클라이언트 NDJSON 스트림 소비 훅
supabase/migrations/0001_init.sql
```

### 실행 흐름

1. Playground에서 `POST /api/runs`를 호출하면 서버는 `agent_runs` 레코드를 생성하고,
   `runDemoAgent()` 제너레이터가 `user_request → plan → search → tool_call → result` 단계를
   순서대로 실행하며 각 단계의 `running`/`completed`/`failed` 상태를 **NDJSON 스트림**으로
   클라이언트에 실시간 전송합니다. 각 이벤트는 즉시 `trace_events`에 upsert되어, 클라이언트가
   연결을 끊어도 기록이 유실되지 않습니다.
   - `plan`: `TAVILY_API_KEY`와 무관하게, `OPENAI_API_KEY`가 있으면 `generatePlanSteps()`가 요청에
     맞는 실제 계획을 생성하고, 없으면 템플릿 계획을 사용합니다.
   - `search`: `TAVILY_API_KEY`가 있으면 `tavilySearch()`로 실제 웹 검색을 수행합니다 (실패 시 mock
     결과로 안전하게 폴백). 없으면 시뮬레이션 검색 결과를 사용합니다.
   - `tool_call`: `TAVILY_API_KEY`가 있으면 첫 검색 결과 URL에 대해 `tavilyExtract()`로 실제 콘텐츠를
     가져옵니다. 시나리오가 `normal`이 아니면(그리고 Fix 적용 전이면) 의도적으로 잘못된 키 / 50ms
     타임아웃 / 엄격한 신선도 임계값으로 **실제 API를 호출**해 진짜 오류를 재현합니다.
2. `tool_call` 단계가 실패하면 `result` 단계는 `skipped`로 표시되고 Run은 `failed` 상태로 종료됩니다.
   클라이언트는 실패를 감지하는 즉시 `POST /api/runs/[id]/analyze`를 호출합니다.
3. `analyze`는 관측 가능한 실행 데이터(단계, Tool 이름, 입력, HTTP 상태, 에러 메시지, 타임스탬프)만을
   근거로 Vercel AI SDK의 `generateObject`를 통해 구조화된 JSON(`failureType`, `rootCause`,
   `riskLevel`, `explanation`, `recommendedFix`, `fixSteps`, `patchSuggestion`)을 생성합니다.
   `OPENAI_API_KEY`가 없으면 동일한 스키마의 규칙 기반 mock 분석으로 대체됩니다.
4. **Fix & Replay** 클릭 시 `POST /api/runs/[id]/replay`가 실패 유형에 맞는 configuration
   patch(`buildFixForScenario`)를 적용한 새 Run을 생성하고 동일한 요청으로 재실행합니다
   (예: `auth_error` → `{ authentication: "valid_token" }`). 원본 Run과 재실행 Run은 `replays`
   테이블로 연결되며, UI는 두 실행의 오류 수 / 성공률 / 실행 시간 / 상태를 나란히 비교합니다.

---

## 8. 품질 체크

```bash
npm run build   # TypeScript strict 컴파일 + 타입 체크 (검증 완료)
npm run lint    # ESLint (검증 완료, 오류 없음)
npm run dev     # 로컬 개발 서버
```

- API Key는 서버 라우트에서만 사용되며 클라이언트 번들에 포함되지 않습니다.
- Supabase / OpenAI 미설정 시에도 전체 데모(P0: Playground, Execution Trace, Error Detection,
  Root Cause Analysis, Fix & Replay)가 end-to-end로 동작하도록 fallback이 구현되어 있습니다.
- 모든 주요 버튼(Run Agent, Fix & Replay, Step 선택, 탭 전환)은 실제 API/상태와 연결되어 있습니다.
