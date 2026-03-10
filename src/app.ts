import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundRouteMiddleware } from "./middleware/notfoundroute.middleware";
import { healthRoute } from "./modules/health";
import { authRouter } from "./modules/auth";
import { categoriesRouter } from "./modules/serviceCategories";
import { servicesRouter } from "./modules/services";
import { serviceRequestsRouter } from "./modules/serviceRequests";
import { usersRouter } from "./modules/users";
import { departmentsRouter } from "./modules/departments";
import { contactRouter } from "./modules/contact";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(helmet());
app.use(morgan("common"));
app.use(express.json());
app.use(cookieParser());

app.use("/api", healthRoute);
app.use("/api/v1", authRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/services", servicesRouter);
app.use("/api/v1/service-requests", serviceRequestsRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/departments", departmentsRouter);
app.use("/api/v1/contact", contactRouter);

app.use(notFoundRouteMiddleware);
app.use(errorMiddleware);

export default app;
