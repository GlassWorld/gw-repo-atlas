CREATE TABLE "repo_atlas"."analysis_job" (
  "id" UUID NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "repo_atlas"."AnalysisStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "analysis_job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analysis_job_idempotencyKey_key"
ON "repo_atlas"."analysis_job"("idempotencyKey");

CREATE INDEX "analysis_job_status_availableAt_idx"
ON "repo_atlas"."analysis_job"("status", "availableAt");

CREATE INDEX "analysis_job_lockedAt_idx"
ON "repo_atlas"."analysis_job"("lockedAt");

COMMENT ON TABLE "repo_atlas"."analysis_job" IS '분석 백그라운드 작업 큐와 재시도 상태를 저장하는 테이블';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."id" IS '분석 작업 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."idempotencyKey" IS '중복 작업 방지 키';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."type" IS '작업 타입';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."status" IS '작업 상태 값';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."payload" IS '작업 실행에 필요한 JSON 페이로드';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."attempts" IS '현재 시도 횟수';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."maxAttempts" IS '최대 시도 횟수';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."availableAt" IS '작업 실행 가능 시각';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."lockedAt" IS '작업 잠금 시각';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."lockedBy" IS '작업 잠금 워커 식별자';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."lastError" IS '마지막 오류 메시지';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."completedAt" IS '작업 완료 일시';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."createdAt" IS '레코드 생성 일시';
COMMENT ON COLUMN "repo_atlas"."analysis_job"."updatedAt" IS '레코드 수정 일시';
