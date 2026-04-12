ALTER TABLE "repo_atlas"."git_domain_credential"
ADD COLUMN "repositoryUrl" TEXT NULL,
ADD COLUMN "repositoryOwner" TEXT NULL,
ADD COLUMN "repositoryName" TEXT NULL,
ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."repositoryUrl" IS '연결된 저장소 정규화 URL';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."repositoryOwner" IS '연결된 저장소 소유자 계정명';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."repositoryName" IS '연결된 저장소 이름';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."isPrivate" IS '연결된 저장소 프라이빗 여부';

UPDATE "repo_atlas"."git_domain_credential" AS g
SET
  "repositoryUrl" = r.url,
  "repositoryOwner" = r.owner,
  "repositoryName" = r.name,
  "isPrivate" = r."isPrivate"
FROM (
  SELECT DISTINCT ON ("git_credential_id")
    "git_credential_id",
    url,
    owner,
    name,
    "isPrivate"
  FROM "repo_atlas"."repository"
  WHERE "git_credential_id" IS NOT NULL
  ORDER BY "git_credential_id", "updatedAt" DESC, "createdAt" DESC, id DESC
) AS r
WHERE g.id = r."git_credential_id"
  AND g."repositoryUrl" IS NULL;

WITH ranked AS (
  SELECT
    id,
    "git_credential_id",
    ROW_NUMBER() OVER (
      PARTITION BY "git_credential_id"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS rn
  FROM "repo_atlas"."repository"
  WHERE "git_credential_id" IS NOT NULL
)
UPDATE "repo_atlas"."repository" AS r
SET "git_credential_id" = NULL
FROM ranked
WHERE r.id = ranked.id
  AND ranked.rn > 1;

DROP INDEX IF EXISTS "repo_atlas"."git_domain_credential_userId_domain_key";

CREATE UNIQUE INDEX "git_domain_credential_userId_repositoryUrl_key"
ON "repo_atlas"."git_domain_credential"("userId", "repositoryUrl");

ALTER TABLE "repo_atlas"."repository"
ADD CONSTRAINT "repository_git_credential_id_key" UNIQUE ("git_credential_id");
