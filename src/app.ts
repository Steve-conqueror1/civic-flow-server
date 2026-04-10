import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { apiReference } from "@scalar/express-api-reference";
import { openApiSpec } from "./openapi";
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
import { aiRouter } from "./modules/ai";
import { geocodeRouter } from "./modules/geocode";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "'https://proxy.scalar.com'"],
      },
    },
  }),
);

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
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/geocode", geocodeRouter);

app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

app.use(
  "/docs",
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],

        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],

        imgSrc: ["'self'", "data:", "https:"],

        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      },
    },
  }),
);

app.use(
  "/docs",
  apiReference({
    url: "/openapi.json",
    theme: "default",
  }),
);

app.use(notFoundRouteMiddleware);
app.use(errorMiddleware);

export default app;
