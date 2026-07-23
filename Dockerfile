# Multi-stage production build for Aegis College Management System
FROM node:20-alpine AS builder

# 1. Build React Frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2. Prepare Express Backend
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./

# 3. Final Production Stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/index.js"]
