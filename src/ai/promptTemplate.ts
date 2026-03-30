interface PromptCategory {
  id: string;
  name: string;
  description: string;
}

interface PromptService {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
}

interface PromptUserRequest {
  title: string;
  description: string;
}

interface AnalysisPromptInput {
  title: string;
  description: string;
  note?: string;
  categories: PromptCategory[];
  services: PromptService[];
  recentUserRequests: PromptUserRequest[];
}

export function buildAnalysisPrompt(input: AnalysisPromptInput): string {
  const { title, description, note, categories, services, recentUserRequests } =
    input;

  const categoriesJson = JSON.stringify(
    categories.map((c) => ({ id: c.id, name: c.name, description: c.description })),
  );

  const servicesJson = JSON.stringify(
    services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      categoryId: s.categoryId,
    })),
  );

  const userRequestsSection =
    recentUserRequests.length > 0
      ? `
The user currently has these open/in-progress requests:
${JSON.stringify(recentUserRequests.map((r) => ({ title: r.title, description: r.description })))}

If the new request is semantically very similar to one of these existing requests, include a "duplicate" alert.`
      : "";

  return `You are a civic service request classifier for CivicFlow, a government services platform.

Analyse the following citizen request and determine the best matching category and service.

CITIZEN REQUEST:
- Title: ${title}
- Description: ${description}${note ? `\n- Additional Note: ${note}` : ""}

AVAILABLE CATEGORIES:
${categoriesJson}

AVAILABLE SERVICES:
${servicesJson}
${userRequestsSection}

INSTRUCTIONS:
1. Match the request to the most appropriate category and service from the lists above.
2. Provide a matchPercentage (0-100) indicating your confidence in the category match.
3. If matchPercentage is below 30, set category to { "id": "other", "name": "Other", "matchPercentage": <value> } and service to null.
4. Provide a summary as an array of up to 3 short bullet-point strings describing the request.
5. Provide at most ONE alert object (or null) with type being one of: "duplicate", "ambiguous", "out_of_scope", "info".
   - "duplicate": if the request closely matches an existing open request from the user
   - "ambiguous": if the request is too vague to confidently classify
   - "out_of_scope": if no category or service fits well
   - "info": for any other helpful contextual note
   Each alert must have a "title" (short label like "Duplicate Alert", "Ambiguous Request", etc.) and a "message" string.
6. If a service matches, include its id, name, and categoryId. If no service matches (or confidence is too low), set service to null.

Respond with ONLY valid JSON matching this exact shape (no markdown, no explanation):
{
  "category": { "id": "string", "name": "string", "matchPercentage": number },
  "service": { "id": "string", "name": "string", "categoryId": "string" } | null,
  "summary": ["string", "string", "string"],
  "alert": { "type": "string", "title": "string", "message": "string" } | null
}`;
}
