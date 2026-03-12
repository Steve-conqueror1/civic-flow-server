import { Worker } from "bullmq";

import { getIO } from "../socket";
import { getFeaturedCase } from "../modules/serviceRequests/requests.service";
import { bullMQConnection } from "../config/redis";

export const startFeaturedCaseWorker = () => {
  const worker = new Worker(
    "featured-case-updates",
    async (job) => {
      if (job.name === "select-and-broadcast") {
        const featured = await getFeaturedCase();

        const io = getIO();
        io.emit("new_featured_case", featured);
        console.log(
          `Successfully AI-selected and broadcasted case: ${featured?.id}`,
        );
      }
    },
    { connection: bullMQConnection, lockDuration: 30000 },
  );
  return worker;
};
