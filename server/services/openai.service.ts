import OpenAI from "openai";
import { parseJsonObject } from "../utils/safe-json";
import { buildProjectHealthProfile } from "../utils/project-health";
import type { AnalysisItemResult, AnalysisItemType, HealthScore } from "../../types/atlas";
import { getAnalysisItemDefinition } from "../../utils/analysis-items";

interface SummaryPayload {
  tagline: string;
  summary: string;
  inferredStack: string[];
  entryPoints: string[];
  healthScore: HealthScorePayload;
}

interface QaPayload {
  answer: string;
  citations: Array<{
    path: string;
    reason: string;
  }>;
}

interface HealthScoreItem {
  score: number;
  reason: string;
}

interface HealthScorePayload {
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

interface AnalysisItemReportPayload extends AnalysisItemResult {}

const fallbackHealthScore: HealthScorePayload = {
  projectKind: {
    id: "unknown",
    label: "Unknown",
    confidence: 0,
    reason: "프로젝트 종류를 판단하지 못했습니다.",
    signals: []
  },
  documentation: {
    score: 0,
    reason: "분석 응답에서 문서화 상태를 확인하지 못했습니다."
  },
  testHarness: {
    score: 0,
    reason: "분석 응답에서 테스트 설정 상태를 확인하지 못했습니다."
  },
  cicd: {
    score: 0,
    reason: "분석 응답에서 CI/CD 설정 상태를 확인하지 못했습니다."
  },
  vibeCoding: {
    score: 0,
    reason: "분석 응답에서 AI 코딩 도구 설정 상태를 확인하지 못했습니다."
  },
  codeQuality: {
    score: 0,
    reason: "분석 응답에서 코드 품질 도구 설정 상태를 확인하지 못했습니다."
  },
  total: 0,
  appliedRules: [],
  flags: [],
  suggestions: []
};

function clampScore(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeHealthScore(value: Partial<HealthScorePayload> | undefined): HealthScorePayload {
  const normalized = {
    projectKind: {
      id: typeof value?.projectKind?.id === "string" ? value.projectKind.id : fallbackHealthScore.projectKind.id,
      label: typeof value?.projectKind?.label === "string" ? value.projectKind.label : fallbackHealthScore.projectKind.label,
      confidence: clampScore(value?.projectKind?.confidence),
      reason: value?.projectKind?.reason || fallbackHealthScore.projectKind.reason,
      signals: Array.isArray(value?.projectKind?.signals)
        ? value.projectKind.signals.filter((item): item is string => typeof item === "string")
        : []
    },
    documentation: {
      score: clampScore(value?.documentation?.score),
      reason: value?.documentation?.reason || fallbackHealthScore.documentation.reason
    },
    testHarness: {
      score: clampScore(value?.testHarness?.score),
      reason: value?.testHarness?.reason || fallbackHealthScore.testHarness.reason
    },
    cicd: {
      score: clampScore(value?.cicd?.score),
      reason: value?.cicd?.reason || fallbackHealthScore.cicd.reason
    },
    vibeCoding: {
      score: clampScore(value?.vibeCoding?.score),
      reason: value?.vibeCoding?.reason || fallbackHealthScore.vibeCoding.reason
    },
    codeQuality: {
      score: clampScore(value?.codeQuality?.score),
      reason: value?.codeQuality?.reason || fallbackHealthScore.codeQuality.reason
    },
    total: 0,
    appliedRules: Array.isArray(value?.appliedRules)
      ? value.appliedRules.filter((item): item is string => typeof item === "string")
      : [],
    flags: Array.isArray(value?.flags) ? value.flags.filter((item): item is string => typeof item === "string") : [],
    suggestions: Array.isArray(value?.suggestions)
      ? value.suggestions.filter((item): item is string => typeof item === "string")
      : []
  };
  normalized.total = clampScore(
    normalized.documentation.score * 0.25 +
      normalized.testHarness.score * 0.25 +
      normalized.cicd.score * 0.2 +
      normalized.vibeCoding.score * 0.15 +
      normalized.codeQuality.score * 0.15
  );
  return normalized;
}

function normalizeSummaryPayload(payload: SummaryPayload): SummaryPayload {
  return {
    ...payload,
    inferredStack: Array.isArray(payload.inferredStack) ? payload.inferredStack : [],
    entryPoints: Array.isArray(payload.entryPoints) ? payload.entryPoints : [],
    healthScore: normalizeHealthScore(payload.healthScore)
  };
}

function getClient(): OpenAI {
  const config = useRuntimeConfig();
  if (!config.openAiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "OPENAI_API_KEY가 설정되지 않았습니다."
    });
  }

  return new OpenAI({
    apiKey: config.openAiApiKey
  });
}

export async function generateProjectSummary(input: {
  repositoryUrl: string;
  fileTree: string[];
  analysisSnippets: Array<{ path: string; snippet: string }>;
  recentCommits: Array<{ title: string; body?: string | null }>;
}): Promise<SummaryPayload> {
  const client = getClient();
  const healthScoreRules = buildProjectHealthProfile({
    fileTree: input.fileTree,
    analysisSnippets: input.analysisSnippets
  });
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "당신은 개발자 온보딩을 돕는 저장소 분석기입니다. 반드시 JSON만 반환하세요. 모든 자연어 문자열은 한국어(ko-KR)로 작성하세요. 기술명, 파일명, 패키지명은 원문을 유지해도 됩니다."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              task: "프로젝트 요약 생성",
              language: "ko-KR",
              repositoryUrl: input.repositoryUrl,
              fileTree: input.fileTree,
              analysisSnippets: input.analysisSnippets,
              recentCommits: input.recentCommits,
              detectedProject: healthScoreRules.projectKind,
              healthScoreRules,
              outputSchema: {
                tagline: "string, 한국어 한 줄 설명",
                summary: "string, 한국어 프로젝트 요약",
                inferredStack: ["string"],
                entryPoints: ["string"],
                healthScore: {
                  projectKind: {
                    id: "string, detectedProject.id와 동일",
                    label: "string, 한국어 또는 기술명",
                    confidence: "number 0~100",
                    reason: "string, 한국어 한 줄 근거",
                    signals: ["string, 한국어 감지 근거"]
                  },
                  documentation: {
                    score: "number 0~100",
                    reason: "string, 한국어 한 줄 근거"
                  },
                  testHarness: {
                    score: "number 0~100",
                    reason: "string, 한국어 한 줄 근거"
                  },
                  cicd: {
                    score: "number 0~100",
                    reason: "string, 한국어 한 줄 근거"
                  },
                  vibeCoding: {
                    score: "number 0~100",
                    reason: "string, 한국어 한 줄 근거"
                  },
                  codeQuality: {
                    score: "number 0~100",
                    reason: "string, 한국어 한 줄 근거"
                  },
                  total: "number 0~100, documentation 25%, testHarness 25%, cicd 20%, vibeCoding 15%, codeQuality 15% 가중 평균",
                  appliedRules: ["string, 한국어. 감지된 프로젝트 종류에 따라 실제 적용한 점검 대상"],
                  flags: ["string, 한국어 주의사항"],
                  suggestions: ["string, 한국어 개선 제안"]
                }
              }
            })
          }
        ]
      }
    ]
  });

  const payload = parseJsonObject<SummaryPayload>(response.output_text, {
    tagline: "저장소 요약을 생성하지 못했습니다.",
    summary: "OpenAI 응답을 구조화하지 못했습니다.",
    inferredStack: [],
    entryPoints: [],
    healthScore: {
      ...fallbackHealthScore,
      projectKind: healthScoreRules.projectKind,
      appliedRules: Object.values(healthScoreRules.categories)
    }
  });
  const normalized = normalizeSummaryPayload(payload);
  return {
    ...normalized,
    healthScore: {
      ...normalized.healthScore,
      projectKind: normalized.healthScore.projectKind.id === "unknown"
        ? healthScoreRules.projectKind
        : normalized.healthScore.projectKind,
      appliedRules: normalized.healthScore.appliedRules.length
        ? normalized.healthScore.appliedRules
        : Object.values(healthScoreRules.categories)
    }
  };
}

export async function answerRepositoryQuestion(input: {
  repositoryUrl: string;
  question: string;
  projectSummary: string | null;
  files: Array<{ path: string; snippet: string | null; summary: string | null }>;
}): Promise<QaPayload> {
  const client = getClient();
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "당신은 RepoAtlas입니다. 제공된 파일 정보만 근거로 답하고 반드시 JSON만 반환하세요. 답변은 한국어로 작성하세요. answer 문자열은 사람이 읽기 쉬운 Markdown 형식으로 작성하세요. 문단은 빈 줄로 구분하고, 여러 항목은 번호 목록이나 불릿 목록으로 나누세요."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              repositoryUrl: input.repositoryUrl,
              question: input.question,
              projectSummary: input.projectSummary,
              files: input.files,
              answerFormat: {
                language: "ko-KR",
                markdown: true,
                rules: [
                  "answer는 Markdown 문자열로 작성",
                  "여러 단계나 항목은 번호 목록(1. 2. 3.) 또는 불릿 목록(-) 사용",
                  "문단 사이는 빈 줄로 구분",
                  "가능하면 짧은 소제목 사용",
                  "제공된 파일 정보 밖의 추측은 금지"
                ]
              },
              outputSchema: {
                answer: "string",
                citations: [
                  {
                    path: "string",
                    reason: "string"
                  }
                ]
              }
            })
          }
        ]
      }
    ]
  });

  return parseJsonObject<QaPayload>(response.output_text, {
    answer: "질문에 대한 구조화된 응답을 생성하지 못했습니다.",
    citations: input.files.slice(0, 3).map((file) => ({
      path: file.path,
      reason: "관련 파일 후보"
    }))
  });
}

function normalizeAnalysisItemReport(payload: Partial<AnalysisItemReportPayload>): AnalysisItemResult {
  return {
    summary: payload.summary || "항목 분석 요약을 생성하지 못했습니다.",
    sections: Array.isArray(payload.sections)
      ? payload.sections
          .filter((item) => typeof item?.title === "string" && typeof item?.body === "string")
          .map((item) => ({ title: item.title, body: item.body }))
      : [],
    findings: Array.isArray(payload.findings)
      ? payload.findings.filter((item): item is string => typeof item === "string")
      : [],
    suggestions: Array.isArray(payload.suggestions)
      ? payload.suggestions.filter((item): item is string => typeof item === "string")
      : [],
    evidence: Array.isArray(payload.evidence)
      ? payload.evidence
          .filter((item) => typeof item?.label === "string" && typeof item?.value === "string")
          .map((item) => ({ label: item.label, value: item.value }))
      : []
  };
}

export async function generateAnalysisItemReport(input: {
  type: AnalysisItemType;
  repositoryUrl: string;
  projectSummary: string | null;
  inferredStack: string[];
  entryPoints: string[];
  fileTree: string[];
  healthScore: HealthScore | null;
  files: Array<{
    path: string;
    language: string | null;
    isEntryPoint: boolean;
    isKeyFile: boolean;
    summary: string | null;
    snippet: string | null;
  }>;
  commits: Array<{
    title: string;
    authorName: string;
    committedAt: string;
    changeSummary: string | null;
  }>;
}): Promise<AnalysisItemResult> {
  const definition = getAnalysisItemDefinition(input.type);
  const client = getClient();
  const scopedFiles = input.files
    .filter((file) => file.isKeyFile || file.isEntryPoint || file.snippet)
    .slice(0, 12);
  const healthScoreRules = buildProjectHealthProfile({
    fileTree: input.fileTree,
    analysisSnippets: scopedFiles
      .filter((file) => file.snippet)
      .map((file) => ({ path: file.path, snippet: file.snippet ?? "" }))
  });

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "당신은 RepoAtlas의 항목별 저장소 분석기입니다. 제공된 데이터만 근거로 분석하고 반드시 JSON만 반환하세요. 모든 자연어 문자열은 한국어(ko-KR)로 작성하세요. 기술명, 파일명, 패키지명은 원문을 유지해도 됩니다."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              task: "항목별 저장소 분석 리포트 생성",
              language: "ko-KR",
              analysisItem: {
                type: input.type,
                title: definition?.title ?? input.type,
                description: definition?.description ?? ""
              },
              repositoryUrl: input.repositoryUrl,
              projectSummary: input.projectSummary,
              inferredStack: input.inferredStack,
              entryPoints: input.entryPoints,
              detectedProject: healthScoreRules.projectKind,
              healthScoreRules,
              fileTree: input.fileTree.slice(0, 200),
              healthScore: input.healthScore,
              files: scopedFiles,
              commits: input.commits.slice(0, 20),
              rules: [
                "모든 설명, 근거, 발견 사항, 개선 제안은 한국어로 작성하세요.",
                "제공된 정보 밖의 추측은 하지 마세요.",
                "summary는 한두 문장으로 작성하세요.",
                "sections는 사용자가 상세 페이지에서 바로 읽을 수 있는 소제목과 설명으로 구성하세요.",
                "findings는 관찰된 사실 위주로 작성하세요.",
                "suggestions는 실행 가능한 개선 제안만 작성하세요.",
                "evidence는 판단에 사용한 파일, 설정, 커밋, 점수 같은 근거를 짧게 나열하세요."
              ],
              outputSchema: {
                summary: "string, 한국어 요약",
                sections: [
                  {
                    title: "string, 한국어 소제목",
                    body: "string, 한국어 본문"
                  }
                ],
                findings: ["string, 한국어 발견 사항"],
                suggestions: ["string, 한국어 개선 제안"],
                evidence: [
                  {
                    label: "string, 한국어 근거 라벨",
                    value: "string, 한국어 또는 파일명/기술명 원문"
                  }
                ]
              }
            })
          }
        ]
      }
    ]
  });

  return normalizeAnalysisItemReport(
    parseJsonObject<AnalysisItemReportPayload>(response.output_text, {
      summary: "항목 분석 응답을 구조화하지 못했습니다.",
      sections: [],
      findings: [],
      suggestions: [],
      evidence: []
    })
  );
}
