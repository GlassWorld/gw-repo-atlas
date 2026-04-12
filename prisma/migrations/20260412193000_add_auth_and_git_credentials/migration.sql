CREATE TABLE "repo_atlas"."user_account" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repo_atlas"."git_domain_credential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "accessToken" TEXT,
    "hasToken" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "git_domain_credential_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "repo_atlas"."repository_url_key";

ALTER TABLE "repo_atlas"."repository"
    ADD COLUMN "userId" UUID,
    ADD COLUMN "domain" TEXT NOT NULL DEFAULT 'github.com',
    ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "repo_atlas"."qa"
    ADD COLUMN "userId" UUID;

CREATE UNIQUE INDEX "user_account_email_key" ON "repo_atlas"."user_account"("email");
CREATE UNIQUE INDEX "git_domain_credential_userId_domain_key" ON "repo_atlas"."git_domain_credential"("userId", "domain");
CREATE UNIQUE INDEX "repository_userId_url_key" ON "repo_atlas"."repository"("userId", "url");

ALTER TABLE "repo_atlas"."repository"
    ADD CONSTRAINT "repository_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "repo_atlas"."user_account"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repo_atlas"."qa"
    ADD CONSTRAINT "qa_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "repo_atlas"."user_account"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repo_atlas"."git_domain_credential"
    ADD CONSTRAINT "git_domain_credential_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "repo_atlas"."user_account"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "repo_atlas"."user_account" IS '서비스 로그인 사용자 계정 정보를 저장하는 테이블';
COMMENT ON TABLE "repo_atlas"."git_domain_credential" IS '사용자별 Git 도메인과 액세스 토큰 정보를 저장하는 테이블';

COMMENT ON COLUMN "repo_atlas"."user_account"."id" IS '사용자 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."user_account"."email" IS '로그인 이메일';
COMMENT ON COLUMN "repo_atlas"."user_account"."name" IS '표시 이름';
COMMENT ON COLUMN "repo_atlas"."user_account"."passwordHash" IS '비밀번호 해시';
COMMENT ON COLUMN "repo_atlas"."user_account"."createdAt" IS '레코드 생성 일시';
COMMENT ON COLUMN "repo_atlas"."user_account"."updatedAt" IS '레코드 수정 일시';

COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."id" IS 'Git 자격증명 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."userId" IS '연결된 사용자 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."domain" IS 'Git 도메인';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."providerName" IS '공급자 표시 이름';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."accessToken" IS '프라이빗 저장소 접근용 액세스 토큰';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."hasToken" IS '토큰 보유 여부';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."isDefault" IS '기본 자격증명 여부';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."createdAt" IS '레코드 생성 일시';
COMMENT ON COLUMN "repo_atlas"."git_domain_credential"."updatedAt" IS '레코드 수정 일시';

COMMENT ON COLUMN "repo_atlas"."repository"."userId" IS '저장소를 등록한 사용자 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."repository"."domain" IS '저장소 도메인';
COMMENT ON COLUMN "repo_atlas"."repository"."isPrivate" IS '프라이빗 저장소 여부';
COMMENT ON COLUMN "repo_atlas"."qa"."userId" IS '질문한 사용자 식별자 UUID';
