export type AnalysisStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type AnalysisItemType = "health" | "structure" | "commits";

export interface RepositoryInput {
  url: string;
}

export interface RegisteredRepository {
  id: string;
  url: string;
  name: string;
  owner: string;
  domain?: string;
  isPrivate?: boolean;
}

export interface FileIndexRecord {
  id: string;
  path: string;
  language: string | null;
  isEntryPoint: boolean;
  isKeyFile: boolean;
  summary: string | null;
  snippet: string | null;
}

export interface CommitRecord {
  id: string;
  commitHash: string;
  authorName: string;
  committedAt: string;
  title: string;
  changeSummary: string | null;
}

export interface HealthScoreItem {
  score: number;
  reason: string;
}

export interface HealthScore {
  projectKind: {
    id: string;
    label: string;
    confidence: number;
    reason: string;
    signals: string[];
  };
  documentation: HealthScoreItem;
  testHarness: HealthScoreItem;
  cicd: HealthScoreItem;
  vibeCoding: HealthScoreItem;
  codeQuality: HealthScoreItem;
  total: number;
  appliedRules: string[];
  flags: string[];
  suggestions: string[];
}

export interface AnalysisItemResult {
  summary: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  findings: string[];
  suggestions: string[];
  evidence: Array<{
    label: string;
    value: string;
  }>;
}

export interface AnalysisArtifactRecord {
  id: string;
  type: AnalysisItemType;
  status: AnalysisStatus;
  title: string;
  summary: string | null;
  result: AnalysisItemResult | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisDetail {
  id: string;
  status: AnalysisStatus;
  projectSummary: string | null;
  projectTagline: string | null;
  inferredStack: string[];
  entryPoints: string[];
  fileTree: string[];
  healthScore: HealthScore | null;
  errorMessage: string | null;
  repository: RegisteredRepository;
  files: FileIndexRecord[];
  commits: CommitRecord[];
  artifacts: AnalysisArtifactRecord[];
}

export interface QaResponse {
  id: string;
  answer: string;
  citations: Array<{
    id: string;
    path: string;
    reason: string | null;
  }>;
}
