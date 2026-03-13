import { Queue } from "bullmq";
import { bullMQConnection } from "../config/redis";

export const featuredCaseQueue = new Queue("featured-case-updates", {
  connection: bullMQConnection,
});

export const setupRecurringAiSelection = async () => {
  const repeatableJobs = await featuredCaseQueue.getJobSchedulers();
  const jobExists = repeatableJobs.some(
    (job) => job.name === "select-and-broadcast",
  );

  if (!jobExists) {
    await featuredCaseQueue.add(
      "select-and-broadcast",
      {},
      {
        repeat: {
          pattern: "0 0 * * *",
          tz: "America/Edmonton",
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
};
