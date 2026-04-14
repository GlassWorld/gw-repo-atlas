import OpenAI from "openai";
import { parseJsonObject } from "../utils/safe-json";

interface SummaryPayload {
  tagline: string;
  summary: string;
  inferredStack: string[];
  entryPoints: string[];
  recommendedReadOrder: string[];
  keyFiles: string[];
}

interface QaPayload {
  answer: string;
  citations: Array<{
    path: string;
    reason: string;
  }>;
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
  keyFiles: Array<{ path: string; snippet: string }>;
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
              keyFiles: input.keyFiles,
              recentCommits: input.recentCommits,
              outputSchema: {
                tagline: "string",
                summary: "string",
                inferredStack: ["string"],
                entryPoints: ["string"],
                recommendedReadOrder: ["string"],
                keyFiles: ["string"]
              }
            })
          }
        ]
      }
    ]
  });

  return parseJsonObject<SummaryPayload>(response.output_text, {
    tagline: "저장소 요약을 생성하지 못했습니다.",
    summary: "OpenAI 응답을 구조화하지 못했습니다.",
    inferredStack: [],
    entryPoints: [],
    recommendedReadOrder: [],
    keyFiles: input.keyFiles.map((file) => file.path)
  });
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
