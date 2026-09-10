FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Passed explicitly (ARG) so Railway/production builds definitely bake the
# backend URL into the bundle via `npm run build`. Falls back to the
# frontend/.env.local value (localhost) for local image builds.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
# Railway (and other hosts) inject PORT; default keeps local `docker run` working.
CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]
