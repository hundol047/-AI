import type { SearchResult } from "@/lib/agent/mockData";
import { buildFinalAnswer } from "@/lib/agent/mockData";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GeneratedAnswer {
  answer: string;
  source: "openai" | "mock";
}

/**
 * Generates the agent's final answer to the user's actual request.
 * The upstream Search/Tool Call steps stay simulated (per the demo agent
 * design), but this step — the part a user actually reads — calls OpenAI
 * for a real, grounded answer when a key is configured. Falls back to a
 * templated mock answer otherwise, so the demo still works end-to-end
 * with zero setup.
 */
export async function generateFinalAnswer(
  userRequest: string,
  results: SearchResult[]
): Promise<GeneratedAnswer> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    await sleep(500 + Math.random() * 300);
    return { answer: buildFinalAnswer(userRequest, results), source: "mock" };
  }

  try {
    const [{ generateText }, { createOpenAI }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
    ]);
    const openai = createOpenAI({ apiKey });

    const sourcesContext = results
      .map(
        (r, i) =>
          `${i + 1}. ${r.title} (${r.source}, ${new Date(r.publishedAt).toLocaleDateString("ko-KR")}) — ${r.snippet}`
      )
      .join("\n");

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "You are the final answer-writing stage of a demo AI research agent. Given the user's " +
        "request and a list of retrieved sources, write a clear, useful, well-organized answer in " +
        "Korean. Use the sources as supporting context but rely on your own knowledge to make the " +
        "answer genuinely informative. Do not mention that the sources are simulated or that you are " +
        "an AI system observing itself. Keep it concise (a few short paragraphs or bullet points).",
      prompt: `사용자 요청: "${userRequest}"\n\n참고 소스:\n${sourcesContext}\n\n위 요청에 대해 명확하고 실질적인 답변을 작성하세요.`,
    });

    return { answer: text, source: "openai" };
  } catch (err) {
    console.error("[generateFinalAnswer] OpenAI call failed, falling back to mock answer:", err);
    return { answer: buildFinalAnswer(userRequest, results), source: "mock" };
  }
}
