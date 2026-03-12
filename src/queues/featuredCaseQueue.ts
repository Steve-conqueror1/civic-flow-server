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
          every: 120000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
};
