CREATE TABLE "repo_atlas"."analysis_artifact" (
  "id" UUID NOT NULL,
  "analysisId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "status" "repo_atlas"."AnalysisStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "result" JSONB,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "analysis_artifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analysis_artifact_analysisId_type_key"
ON "repo_atlas"."analysis_artifact"("analysisId", "type");

CREATE INDEX "analysis_artifact_analysisId_status_idx"
ON "repo_atlas"."analysis_artifact"("analysisId", "status");

ALTER TABLE "repo_atlas"."analysis_artifact"
ADD CONSTRAINT "analysis_artifact_analysisId_fkey"
FOREIGN KEY ("analysisId") REFERENCES "repo_atlas"."analysis"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "repo_atlas"."analysis_artifact" IS '항목별 분석 실행 상태와 결과 페이로드를 저장하는 테이블';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."id" IS '항목별 분석 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."analysisId" IS '연결된 분석 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."type" IS '분석 항목 타입';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."status" IS '항목별 분석 상태 값';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."title" IS '항목별 분석 제목';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."summary" IS '항목별 분석 요약';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."result" IS '항목별 분석 결과 JSON';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."errorMessage" IS '항목별 분석 실패 시 오류 메시지';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."startedAt" IS '항목별 분석 시작 일시';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."completedAt" IS '항목별 분석 완료 일시';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."createdAt" IS '레코드 생성 일시';
COMMENT ON COLUMN "repo_atlas"."analysis_artifact"."updatedAt" IS '레코드 수정 일시';
