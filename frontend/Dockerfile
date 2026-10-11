ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# El build de Vite son ficheros estáticos: se sirven con nginx, que además
# hace de proxy de /api hacia el backend (BACKEND_URL).
FROM nginx:1.27-alpine
ENV BACKEND_URL=http://backend:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
