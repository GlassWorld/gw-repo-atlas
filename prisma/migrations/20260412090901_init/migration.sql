-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "repository" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "branch" TEXT,
    "defaultRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "projectSummary" TEXT,
    "projectTagline" TEXT,
    "inferredStack" JSONB,
    "entryPoints" JSONB,
    "recommendedReadOrder" JSONB,
    "keyFiles" JSONB,
    "fileTree" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_index" (
    "id" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "language" TEXT,
    "isEntryPoint" BOOLEAN NOT NULL DEFAULT false,
    "isKeyFile" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "snippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commit_summary" (
    "id" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "commitHash" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commit_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citation" (
    "id" UUID NOT NULL,
    "qaId" UUID NOT NULL,
    "fileIndexId" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repository_url_key" ON "repository"("url");

-- CreateIndex
CREATE INDEX "analysis_repositoryId_status_idx" ON "analysis"("repositoryId", "status");

-- CreateIndex
CREATE INDEX "file_index_analysisId_path_idx" ON "file_index"("analysisId", "path");

-- CreateIndex
CREATE INDEX "commit_summary_analysisId_committedAt_idx" ON "commit_summary"("analysisId", "committedAt");

-- CreateIndex
CREATE INDEX "qa_analysisId_createdAt_idx" ON "qa"("analysisId", "createdAt");

-- CreateIndex
CREATE INDEX "citation_qaId_idx" ON "citation"("qaId");

-- CreateIndex
CREATE INDEX "citation_fileIndexId_idx" ON "citation"("fileIndexId");

-- AddForeignKey
ALTER TABLE "analysis" ADD CONSTRAINT "analysis_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_index" ADD CONSTRAINT "file_index_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commit_summary" ADD CONSTRAINT "commit_summary_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa" ADD CONSTRAINT "qa_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa" ADD CONSTRAINT "qa_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation" ADD CONSTRAINT "citation_qaId_fkey" FOREIGN KEY ("qaId") REFERENCES "qa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation" ADD CONSTRAINT "citation_fileIndexId_fkey" FOREIGN KEY ("fileIndexId") REFERENCES "file_index"("id") ON DELETE CASCADE ON UPDATE CASCADE;
