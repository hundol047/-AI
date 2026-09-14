import type { Scenario } from "@/lib/types";

/** Deterministic-ish helpers used to build believable mock tool output for the demo agent. */

export interface SearchResult {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

export function buildPlan(userRequest: string): string[] {
  return [
    `요청 분석: "${userRequest.slice(0, 60)}${userRequest.length > 60 ? "…" : ""}"의 의도와 범위를 파악합니다.`,
    "검색 키워드를 선정하고 관련 정보 소스를 수집합니다.",
    "외부 도구(API)를 호출하여 최신 데이터를 조회합니다.",
    "수집된 데이터를 종합하여 최종 답변을 생성합니다.",
  ];
}

export function buildSearchResults(userRequest: string, scenario: Scenario): SearchResult[] {
  const topic = userRequest.slice(0, 40) || "요청 주제";
  const outdated = scenario === "outdated_source";
  return [
    {
      title: `${topic} - 최신 시장 리포트`,
      url: "https://market-research.example.com/report",
      source: "Market Research Weekly",
      publishedAt: outdated ? monthsAgo(14) : monthsAgo(1),
      snippet: `${topic}에 대한 주요 지표와 동향을 다룬 리포트입니다.`,
    },
    {
      title: `${topic} 관련 업계 뉴스 브리핑`,
      url: "https://industry-news.example.com/briefing",
      source: "Industry News Daily",
      publishedAt: outdated ? monthsAgo(11) : monthsAgo(2),
      snippet: `${topic}과 관련된 최신 업계 동향을 요약했습니다.`,
    },
    {
      title: `${topic} 데이터 분석 아카이브`,
      url: "https://data-archive.example.com/dataset",
      source: "Open Data Archive",
      publishedAt: outdated ? monthsAgo(19) : monthsAgo(3),
      snippet: `${topic}에 대한 정량 데이터셋과 통계 자료입니다.`,
    },
  ];
}

export function buildFinalAnswer(userRequest: string, results: SearchResult[]): string {
  const bullets = results
    .map((r) => `- ${r.title} (${r.source}, ${new Date(r.publishedAt).toLocaleDateString("ko-KR")})`)
    .join("\n");
  return [
    `"${userRequest}"에 대한 분석 결과를 정리했습니다.`,
    "",
    "핵심 소스:",
    bullets,
    "",
    "요약: 수집된 데이터를 기반으로 최근 동향은 전반적으로 상승세를 보이고 있으며, 관련 지표들이 안정적인 패턴을 유지하고 있습니다. 자세한 내용은 각 소스를 참고하세요.",
  ].join("\n");
}
