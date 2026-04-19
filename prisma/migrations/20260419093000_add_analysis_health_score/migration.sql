ALTER TABLE "repo_atlas"."analysis"
ADD COLUMN "healthScore" JSONB;

COMMENT ON COLUMN "repo_atlas"."analysis"."healthScore" IS '저장소 운영 건강도 점수 JSON';
