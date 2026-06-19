FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=https://api.checklove.babyress.games/api
ARG VITE_PUSH_PUBLIC_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUSH_PUBLIC_KEY=$VITE_PUSH_PUBLIC_KEY

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install

COPY apps/web apps/web
RUN npm run build -w @lovecheck/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
