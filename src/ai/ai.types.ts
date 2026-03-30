export interface AnalysisCategory {
  id: string;
  name: string;
  matchPercentage: number;
}

export interface AnalysisService {
  id: string;
  name: string;
  categoryId: string;
}

export interface AnalysisAlert {
  type: "duplicate" | "ambiguous" | "out_of_scope" | "info";
  title: string;
  message: string;
}

export interface AnalysisResult {
  category: AnalysisCategory;
  service: AnalysisService | null;
  summary: string[];
  alert: AnalysisAlert | null;
}
