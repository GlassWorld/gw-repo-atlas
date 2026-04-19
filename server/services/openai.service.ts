import OpenAI from "openai";
import { parseJsonObject } from "../utils/safe-json";

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
  documentation: HealthScoreItem;
  testHarness: HealthScoreItem;
  cicd: HealthScoreItem;
  vibeCoding: HealthScoreItem;
  codeQuality: HealthScoreItem;
  total: number;
  flags: string[];
  suggestions: string[];
}

const fallbackHealthScore: HealthScorePayload = {
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
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "당신은 개발자 온보딩을 돕는 저장소 분석기입니다. 반드시 JSON만 반환하세요."
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
              repositoryUrl: input.repositoryUrl,
              fileTree: input.fileTree,
              analysisSnippets: input.analysisSnippets,
              recentCommits: input.recentCommits,
              healthScoreRules: {
                source: "fileTree와 analysisSnippets만 근거로 판단하세요.",
                categories: {
                  documentation: "README.md, CHANGELOG, docs/ 폴더 존재 여부와 문서 스니펫",
                  testHarness: "jest.config.*, vitest.config.*, pytest.ini, playwright.config.*, cypress.json 존재 여부",
                  cicd: ".github/workflows/*.yml, .github/workflows/*.yaml, .gitlab-ci.yml, Jenkinsfile 존재 여부",
                  vibeCoding: ".cursorrules, copilot-instructions.md, .aider, .continue 존재 여부",
                  codeQuality: ".eslintrc.*, .prettierrc, ruff.toml, sonar-project.properties 존재 여부"
                },
                scoring: {
                  range: "0~100",
                  totalWeights: {
                    documentation: 25,
                    testHarness: 25,
                    cicd: 20,
                    vibeCoding: 15,
                    codeQuality: 15
                  },
                  flags: "주의사항 배열. 예: .env가 fileTree에 있으면 민감정보 커밋 가능성을 경고",
                  suggestions: "개선 제안 배열"
                }
              },
              outputSchema: {
                tagline: "string",
                summary: "string",
                inferredStack: ["string"],
                entryPoints: ["string"],
                healthScore: {
                  documentation: {
                    score: "number 0~100",
                    reason: "string 한 줄 근거"
                  },
                  testHarness: {
                    score: "number 0~100",
                    reason: "string 한 줄 근거"
                  },
                  cicd: {
                    score: "number 0~100",
                    reason: "string 한 줄 근거"
                  },
                  vibeCoding: {
                    score: "number 0~100",
                    reason: "string 한 줄 근거"
                  },
                  codeQuality: {
                    score: "number 0~100",
                    reason: "string 한 줄 근거"
                  },
                  total: "number 0~100, documentation 25%, testHarness 25%, cicd 20%, vibeCoding 15%, codeQuality 15% 가중 평균",
                  flags: ["string"],
                  suggestions: ["string"]
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
    healthScore: fallbackHealthScore
  });
  return normalizeSummaryPayload(payload);
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
