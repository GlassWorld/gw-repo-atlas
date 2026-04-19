import { processNextAnalysisJob } from "../services/analysis-job.service";

let isWorkerStarted = false;
let isProcessing = false;

export default defineNitroPlugin((nitroApp) => {
  if (isWorkerStarted) {
    return;
  }

  isWorkerStarted = true;

  const tick = async () => {
    if (isProcessing) {
      return;
    }

    isProcessing = true;

    try {
      let processed = true;
      while (processed) {
        processed = await processNextAnalysisJob();
      }
    } catch (error) {
      console.error("[RepoAtlas] analysis worker tick failed", error);
    } finally {
      isProcessing = false;
    }
  };

  const interval = setInterval(() => {
    void tick();
  }, 2_000);

  void tick();

  nitroApp.hooks.hook("close", () => {
    clearInterval(interval);
  });
});
