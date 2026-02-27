backend/
├── src/
│ ├── app.ts
│ ├── server.ts
│
│ ├── config/
│ │ ├── env.ts
│ │ ├── database.ts
│ │ └── redis.ts
│
│ ├── modules/
│ │ ├── auth/
│ │ │ ├── auth.controller.ts
│ │ │ ├── auth.service.ts
│ │ │ ├── auth.repository.ts
│ │ │ ├── auth.routes.ts
│ │ │ ├── auth.schema.ts
│ │ │ └── auth.types.ts
│ │ │
│ │ ├── users/
│ │ │ ├── users.controller.ts
│ │ │ ├── users.service.ts
│ │ │ ├── users.repository.ts
│ │ │ ├── users.routes.ts
│ │ │ ├── users.schema.ts
│ │ │ └── users.types.ts
│ │ │
│ │ ├── requests/
│ │ │ ├── requests.controller.ts
│ │ │ ├── requests.service.ts
│ │ │ ├── requests.repository.ts
│ │ │ ├── requests.routes.ts
│ │ │ ├── requests.schema.ts
│ │ │ ├── requests.types.ts
│ │ │ └── requests.ai.ts
│
│ ├── ai/
│ │ ├── aiClient.ts
│ │ ├── summarizer.service.ts
│ │ ├── classifier.service.ts
│ │ ├── guardrails.ts
│ │ └── ai.types.ts
│
│ ├── middleware/
│ │ ├── auth.middleware.ts
│ │ ├── rbac.middleware.ts
│ │ ├── rateLimit.middleware.ts
│ │ ├── error.middleware.ts
│ │ └── audit.middleware.ts
│
│ ├── utils/
│ │ ├── logger.ts
│ │ ├── constants.ts
│ │ ├── httpResponse.ts
│ │ └── asyncHandler.ts
│
│ ├── shared/
│ │ ├── types/
│ │ ├── errors/
│ │ └── validators/
│
│ └── tests/
│ ├── setup.ts
│ └── integration/
│
├── drizzle/
│ └── meta/
│
├── .env
├── tsconfig.json
├── package.json
└── dockerfile
