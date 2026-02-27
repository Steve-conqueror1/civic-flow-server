## CivicFlow | Backend (Node.js + Express + Drizzle ORM)

**CivicFlow Backend** powers the AI-enabled government services portal, providing secure APIs, authentication, AI classification, and citizen request processing.

Built with a modular, scalable architecture using Node.js, Express, TypeScript, and Drizzle ORM, the backend is designed for privacy-first public sector applications.

## Project Overview

**The backend provides:**

- Secure authentication (JWT-based)
- Role-Based Access Control (RBAC)
- Citizen service request processing
- AI-powered classification & summarization
- Admin insights support
- Rate limiting & audit logging
- Production-ready error handling
- PostgreSQL with Drizzle ORM
- Redis for caching / rate limiting

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Caching:** Redis
- **Validation:** Zod
- **Authentication:** JWT
- **AI Layer:** Custom AI client + Guardrails
- **Logging:** Structured logger
- **Testing:** Vitest / Integration Tests
- **Containerization:** Docker

## Architecture Philosophy

The backend follows a modular domain-driven structure, where each module encapsulates:

- Controller (HTTP layer)
- Service (business logic)
- Repository (database layer)
- Schema (validation)
- Types (domain typing)

## Database & Migrations

# Using Drizzle ORM with PostgreSQL.

```bash
npm run drizzle:generate
```

```bash
npm run drizzle:migrate
```

## Run development server

```bash
npm run dev
```

Developed with ❤️ by **Stephen Kilonzo**  
[GitHub](https://github.com/Steve-conqueror1) | [LinkedIn](https://www.linkedin.com/in/skilonzo/)
