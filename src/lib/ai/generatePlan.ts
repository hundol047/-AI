import { buildPlan } from "@/lib/agent/mockData";

export interface GeneratedPlan {
  steps: string[];
  source: "openai" | "mock";
}

/** Generates the agent's structured task-plan summary for the given request.
 * Uses OpenAI when configured for a genuinely request-specific breakdown;
 * falls back to a deterministic template otherwise. Never asks for or
 * exposes hidden model reasoning — only a short, user-facing step list. */
export async function generatePlanSteps(userRequest: string): Promise<GeneratedPlan> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { steps: buildPlan(userRequest), source: "mock" };
  }

  try {
    const [{ generateObject }, { createOpenAI }, { z }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
      import("zod"),
    ]);
    const openai = createOpenAI({ apiKey });

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        steps: z.array(z.string()).min(3).max(5).describe("Concrete execution steps, in Korean"),
      }),
      system:
        "You are the planning stage of a research agent. Break the user's request into 3-5 short, " +
        "concrete execution steps (what to search for, what to verify, how to synthesize the answer) " +
        "in Korean. Only produce the plan — do not answer the request itself.",
      prompt: `사용자 요청: "${userRequest}"`,
    });

    return { steps: object.steps, source: "openai" };
  } catch (err) {
    console.error("[generatePlanSteps] OpenAI call failed, falling back to mock plan:", err);
    return { steps: buildPlan(userRequest), source: "mock" };
  }
}
