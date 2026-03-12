import http from "http";
import app from "./app";
import dotenv from "dotenv";
import { initSocket } from "./socket";
import { setupRecurringAiSelection } from "./queues";
import { startFeaturedCaseWorker } from "./workers/featuredCaseWorker";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const server = http.createServer(app);

initSocket(server);

startFeaturedCaseWorker();

server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await setupRecurringAiSelection();
});
