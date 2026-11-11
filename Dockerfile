# Imagem única: a API (Express) serve também o frontend compilado — um serviço só, sem CORS.
# Build:  docker build -t igreja-gestao .
# Rodar:  docker run -p 3333:3333 --env-file backend/.env igreja-gestao

FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY . .
RUN npx prisma generate --schema backend/prisma/schema.prisma \
 && npm run build --workspace=frontend \
 && npm run build --workspace=backend

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# Só dependências de execução do backend + prisma CLI (migrate deploy) + tsx global (seed do admin).
# tsx vai global porque, com NODE_ENV=production, o npm ignora devDependencies e não o instalaria no workspace.
RUN npm ci --omit=dev --workspace=backend --include-workspace-root=false \
 && npm install --no-save prisma@5 --workspace=backend \
 && npm install -g tsx@4 \
 && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/prisma backend/prisma
COPY --from=build /app/frontend/dist frontend/dist
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
USER node
EXPOSE 3333
# Aplica as migrações pendentes e sobe o servidor
CMD ["sh", "-c", "npx --prefix backend prisma migrate deploy --schema backend/prisma/schema.prisma && node backend/dist/server.js"]
