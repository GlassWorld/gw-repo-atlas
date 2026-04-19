interface AnalysisItemState {
  completed: boolean;
  running: boolean;
  artifact: {
    status: string;
    errorMessage: string | null;
  } | null;
}

export interface ToneSignal {
  className: string;
  emoji: string;
  label: string;
}

export function getHealthScoreTone(score: number): ToneSignal {
  if (score >= 80) {
    return {
      className: "health-score-good",
      emoji: "✅",
      label: "좋음"
    };
  }

  if (score >= 50) {
    return {
      className: "health-score-neutral",
      emoji: "😐",
      label: "보통"
    };
  }

  return {
    className: "health-score-bad",
    emoji: "⚠️",
    label: "주의"
  };
}

export function getAnalysisItemTone(item: AnalysisItemState): ToneSignal {
  if (item.running) {
    return {
      className: "analysis-item-running",
      emoji: "🔄",
      label: "진행 중"
    };
  }

  if (item.completed) {
    return {
      className: "analysis-item-success",
      emoji: "✅",
      label: "완료"
    };
  }

  if (item.artifact?.status === "FAILED") {
    return {
      className: "analysis-item-failed",
      emoji: "⚠️",
      label: "실패"
    };
  }

  return {
    className: "analysis-item-pending",
    emoji: "😐",
    label: "대기"
  };
}
