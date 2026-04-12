export type AnalysisStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

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

export interface AnalysisDetail {
  id: string;
  status: AnalysisStatus;
  projectSummary: string | null;
  projectTagline: string | null;
  inferredStack: string[];
  entryPoints: string[];
  recommendedReadOrder: string[];
  keyFiles: string[];
  fileTree: string[];
  errorMessage: string | null;
  repository: RegisteredRepository;
  files: FileIndexRecord[];
  commits: CommitRecord[];
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
