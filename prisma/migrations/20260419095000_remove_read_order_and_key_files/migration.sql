ALTER TABLE "repo_atlas"."analysis"
DROP COLUMN IF EXISTS "recommendedReadOrder",
DROP COLUMN IF EXISTS "keyFiles";

COMMENT ON COLUMN "repo_atlas"."file_index"."isKeyFile" IS '분석용 스니펫 대상 여부';
