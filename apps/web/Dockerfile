FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG API_BACKEND_URL=http://api:3000
ARG NEXT_PUBLIC_API_URL=https://localhost/api/v1
ENV API_BACKEND_URL=$API_BACKEND_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.ts ./
EXPOSE 3001
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3001"]
