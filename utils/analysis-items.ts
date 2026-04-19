import type { AnalysisArtifactRecord, AnalysisDetail, AnalysisItemType } from "../types/atlas";

export type AnalysisItemGroupId = "quality" | "structure" | "activity";

export interface AnalysisItemGroupDefinition {
  id: AnalysisItemGroupId;
  title: string;
  description: string;
}

export interface AnalysisItemDefinition {
  type: AnalysisItemType;
  groupId: AnalysisItemGroupId;
  title: string;
  description: string;
}

export interface AnalysisItemView extends AnalysisItemDefinition {
  summary: string;
  ready: boolean;
  completed: boolean;
  running: boolean;
  artifact: AnalysisArtifactRecord | null;
}

export const ANALYSIS_ITEM_GROUPS: AnalysisItemGroupDefinition[] = [
  {
    id: "quality",
    title: "품질·운영",
    description: "운영 준비도와 개선 제안"
  },
  {
    id: "structure",
    title: "구조",
    description: "파일 구성과 엔트리포인트"
  },
  {
    id: "activity",
    title: "활동",
    description: "최근 커밋과 작업 흐름"
  }
];

export const ANALYSIS_ITEM_DEFINITIONS: AnalysisItemDefinition[] = [
  {
    type: "health",
    groupId: "quality",
    title: "저장소 건강도",
    description: "문서화, 테스트, CI/CD, AI 코딩 설정, 코드 품질 도구 점검"
  },
  {
    type: "structure",
    groupId: "structure",
    title: "구조 시그널",
    description: "파일 분포, 엔트리포인트, 분석용 스니펫 후보 확인"
  },
  {
    type: "commits",
    groupId: "activity",
    title: "커밋 흐름",
    description: "최근 커밋, 작성자, 변경 흐름 요약"
  }
];

export const ANALYSIS_ITEM_TYPES = ANALYSIS_ITEM_DEFINITIONS.map((item) => item.type);

export function isAnalysisItemType(value: unknown): value is AnalysisItemType {
  return typeof value === "string" && ANALYSIS_ITEM_TYPES.includes(value as AnalysisItemType);
}

export function getAnalysisItemDefinition(type: AnalysisItemType) {
  return ANALYSIS_ITEM_DEFINITIONS.find((item) => item.type === type);
}

export function buildAnalysisItems(analysis: AnalysisDetail): AnalysisItemView[] {
  return ANALYSIS_ITEM_DEFINITIONS.map((item) => ({
    ...item,
    ...getAnalysisItemState(item.type, analysis)
  }));
}

export function buildAnalysisGroups(items: AnalysisItemView[]) {
  return ANALYSIS_ITEM_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.groupId === group.id)
  })).filter((group) => group.items.length > 0);
}

function getAnalysisItemState(type: AnalysisItemType, analysis: AnalysisDetail) {
  const ready = analysis.status === "SUCCESS";
  const artifact = analysis.artifacts.find((item) => item.type === type) ?? null;
  const isRunning = artifact?.status === "PENDING" || artifact?.status === "RUNNING";
  const isComplete = artifact?.status === "SUCCESS";

  switch (type) {
    case "health":
      return {
        artifact,
        running: isRunning,
        ready: ready && !isRunning,
        completed: isComplete,
        summary: artifact?.summary ?? (analysis.healthScore
          ? `총점 ${analysis.healthScore.total}/100 · 주의사항 ${analysis.healthScore.flags.length}개 · 개선 제안 ${analysis.healthScore.suggestions.length}개`
          : "건강도 분석 결과가 아직 없습니다.")
      };
    case "structure":
      return {
        artifact,
        running: isRunning,
        ready: ready && !isRunning,
        completed: isComplete,
        summary: artifact?.summary ?? `${analysis.files.length} files · ${analysis.entryPoints.length} entry points · ${analysis.files.filter((file) => file.snippet).length} snippets`
      };
    case "commits":
      return {
        artifact,
        running: isRunning,
        ready: ready && !isRunning,
        completed: isComplete,
        summary: artifact?.summary ?? `${analysis.commits.length} recent commits`
      };
  }
}
