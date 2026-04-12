import { prisma } from "../db/prisma";
import { answerRepositoryQuestion } from "./openai.service";

function normalizeMultilineText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
}

function scoreFile(question: string, file: { path: string; summary: string | null; isKeyFile: boolean; isEntryPoint: boolean }) {
  const tokens = question
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 2);

  const haystack = `${file.path} ${file.summary ?? ""}`.toLowerCase();
  const matches = tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0);
  const bonus = (file.isKeyFile ? 2 : 0) + (file.isEntryPoint ? 2 : 0);
  return matches + bonus;
}

export async function answerQuestion(input: {
  userId: string;
  repositoryId: string;
  analysisId: string;
  question: string;
}) {
  const analysis = await prisma.analysis.findUnique({
    where: { id: input.analysisId },
    include: {
      repository: true,
      files: true
    }
  });

  if (!analysis || analysis.repositoryId !== input.repositoryId || analysis.repository.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      statusMessage: "질문 대상 분석 결과를 찾을 수 없습니다."
    });
  }

  const candidateFiles = [...analysis.files]
    .sort((left, right) => scoreFile(input.question, right) - scoreFile(input.question, left))
    .slice(0, 6);

  const qaPayload = await answerRepositoryQuestion({
    repositoryUrl: analysis.repository.url,
    question: input.question,
    projectSummary: analysis.projectSummary,
    files: candidateFiles.map((file) => ({
      path: file.path,
      summary: file.summary,
      snippet: file.snippet
    }))
  });

  const qa = await prisma.qa.create({
    data: {
      userId: input.userId,
      repositoryId: analysis.repositoryId,
      analysisId: analysis.id,
      question: input.question,
      answer: normalizeMultilineText(qaPayload.answer)
    }
  });

  const matchedFileIndexes = candidateFiles.filter((file) =>
    qaPayload.citations.some((citation) => citation.path === file.path)
  );

  if (matchedFileIndexes.length > 0) {
    await prisma.citation.createMany({
      data: matchedFileIndexes.map((file) => ({
        qaId: qa.id,
        fileIndexId: file.id,
        reason:
          qaPayload.citations.find((citation) => citation.path === file.path)?.reason ?? "관련 파일"
      }))
    });
  }

  const citations = await prisma.citation.findMany({
    where: { qaId: qa.id },
    include: { fileIndex: true }
  });

  return {
    id: qa.id,
    answer: qa.answer,
    citations: citations.map((citation) => ({
      id: citation.id,
      path: citation.fileIndex.path,
      reason: citation.reason
    }))
  };
}

export async function listQaHistory(userId: string) {
  const qas = await prisma.qa.findMany({
    where: { userId },
    include: {
      repository: true,
      analysis: true,
      citations: {
        include: {
          fileIndex: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 30
  });

  return qas.map((qa) => ({
    id: qa.id,
    question: qa.question,
    answer: qa.answer,
    createdAt: qa.createdAt.toISOString(),
    repository: {
      id: qa.repository.id,
      owner: qa.repository.owner,
      name: qa.repository.name
    },
    analysis: {
      id: qa.analysis.id,
      status: qa.analysis.status
    },
    citations: qa.citations.map((citation) => ({
      id: citation.id,
      path: citation.fileIndex.path,
      reason: citation.reason
    }))
  }));
}
