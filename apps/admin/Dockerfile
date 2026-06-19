FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=https://api.lovestory.babyress.games/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/package.json
RUN npm install

COPY apps/admin apps/admin
RUN npm run build -w @lovecheck/admin

FROM nginx:1.27-alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
