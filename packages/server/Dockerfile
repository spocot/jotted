FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/server/ ./packages/server/
RUN npm ci
RUN npm run build -w packages/server

FROM node:22-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/server/package.json ./packages/server/package.json
COPY --from=build /app/packages/server/dist ./dist
EXPOSE 3000
ENV NODE_ENV=production
ENV DB_PATH=/data/jotted.db
ENV UPLOADS_DIR=/data/uploads
VOLUME /data
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
