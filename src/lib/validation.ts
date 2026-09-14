import { z } from "zod";

export const scenarioEnum = z.enum(["normal", "auth_error", "outdated_source", "tool_timeout"]);

export const createRunSchema = z.object({
  userRequest: z.string().trim().min(1, "요청을 입력해주세요.").max(2000),
  scenario: scenarioEnum.default("normal"),
});
