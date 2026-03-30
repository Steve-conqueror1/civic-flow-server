import { generateText } from "ai";
import { openai } from "./aiClient";
import { AppError } from "../shared/errors/AppError";
import type { AnalysisResult } from "./ai.types";

export async function classifyRequest(
  prompt: string,
): Promise<AnalysisResult> {
  let text: string;

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    });
    text = result.text;
  } catch {
    throw new AppError(503, "AI analysis service is currently unavailable.");
  }

  try {
    return JSON.parse(text) as AnalysisResult;
  } catch {
    throw new AppError(
      503,
      "AI returned an invalid response. Please try again.",
    );
  }
}
