import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundRouteMiddleware } from "./middleware/notfoundroute.middleware.js";
import { healthRoute } from "./modules/health";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(helmet());
app.use(morgan("common"));
app.use(express.json());
app.use(cookieParser());

app.use("/api", healthRoute);

app.use(notFoundRouteMiddleware);
app.use(errorMiddleware);

export default app;
