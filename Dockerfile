# Build Stage 
FROM node:20.19-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:20.19-alpine AS production

WORKDIR /app

ENV PORT=5001
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE $PORT

CMD ["node", "dist/server.js"]
