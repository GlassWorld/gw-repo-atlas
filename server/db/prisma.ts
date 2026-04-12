import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __repoAtlasPrisma__: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __repoAtlasSchemaGuard__: boolean | undefined;
}

export const prisma =
  globalThis.__repoAtlasPrisma__ ??
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__repoAtlasPrisma__ = prisma;
}

if (!globalThis.__repoAtlasSchemaGuard__) {
  globalThis.__repoAtlasSchemaGuard__ = true;

  void prisma.$queryRawUnsafe<Array<{ current_schema: string }>>("select current_schema() as current_schema")
    .then((rows) => {
      const activeSchema = rows[0]?.current_schema;
      if (activeSchema !== "repo_atlas") {
        throw new Error(
          `[RepoAtlas] Active database schema must be repo_atlas, received: ${activeSchema ?? "unknown"}`
        );
      }
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });
}
