import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./config";

export const openApiSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CivicFlow API",
      version: "1.0.0",
      description: "API for CivicFlow public service platform",
    },
    servers: [
      {
        url: env.API_ENDPOINT,
        description: "Hosted CivicFlow API",
      },
    ],
    tags: [
      { name: "Health", description: "Server health check" },
      { name: "Auth", description: "Authentication and account security" },
      { name: "Users", description: "User profiles and admin user management" },
      { name: "Departments", description: "Government departments" },
      { name: "Categories", description: "Service categories" },
      { name: "Services", description: "Public services catalog" },
      {
        name: "Service Requests",
        description: "Citizen service requests and tracking",
      },
      { name: "Contact", description: "Contact enquiries" },
      { name: "Geocode", description: "Location search and geocoding" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "access_token",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
        ValidationError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation failed" },
            errors: { type: "object" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
          },
        },
      },
    },
  },
  apis: [
    process.env.NODE_ENV === "production" ? "./dist/**/*.js" : "./src/**/*.ts",
  ],
});
