import * as categoryRepository from "../serviceCategories/category.repository";
import * as serviceRepository from "../services/service.repository";
import * as requestRepository from "../serviceRequests/requests.repository";
import { buildAnalysisPrompt } from "../../ai/promptTemplate";
import { classifyRequest } from "../../ai/classifier.service";
import type { AnalysisResult } from "../../ai/ai.types";
import type { AnalyseRequestBody } from "../../zodschemas/ai";

export async function analyseRequest(
  userId: string,
  body: AnalyseRequestBody,
): Promise<AnalysisResult> {
  const [categories, servicesResult, recentUserRequests] = await Promise.all([
    categoryRepository.findAllActive(),
    serviceRepository.findAll({ page: 1, limit: 500 }),
    requestRepository.findActiveForUser(userId),
  ]);

  if (categories.length === 0 || servicesResult.rows.length === 0) {
    return {
      category: { id: "other", name: "Other", matchPercentage: 0 },
      service: null,
      summary: ["Unable to classify request — no active categories or services available."],
      alert: {
        type: "out_of_scope",
        title: "No Services Available",
        message: "There are currently no active services to match your request against.",
      },
    };
  }

  const prompt = buildAnalysisPrompt({
    title: body.title,
    description: body.description,
    note: body.note,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
    })),
    services: servicesResult.rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      categoryId: s.categoryId,
    })),
    recentUserRequests: recentUserRequests.map((r) => ({
      title: r.title,
      description: r.description,
    })),
  });

  return classifyRequest(prompt);
}
