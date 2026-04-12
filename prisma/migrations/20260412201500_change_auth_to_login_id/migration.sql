ALTER TABLE "repo_atlas"."user_account"
    ADD COLUMN "loginId" TEXT;

UPDATE "repo_atlas"."user_account"
SET "loginId" = split_part(email, '@', 1)
WHERE "loginId" IS NULL AND email IS NOT NULL;

UPDATE "repo_atlas"."user_account"
SET "loginId" = CONCAT('user_', substring(id::text, 1, 8))
WHERE "loginId" IS NULL;

ALTER TABLE "repo_atlas"."user_account"
    ALTER COLUMN "loginId" SET NOT NULL,
    ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "user_account_loginId_key" ON "repo_atlas"."user_account"("loginId");

COMMENT ON COLUMN "repo_atlas"."user_account"."loginId" IS '로그인 아이디';
COMMENT ON COLUMN "repo_atlas"."user_account"."email" IS '연락용 이메일';
