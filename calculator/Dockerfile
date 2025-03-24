FROM node AS installer
WORKDIR /app
COPY . .
RUN npm i

FROM installer AS builder
WORKDIR /app
RUN npm run build

FROM builder AS runtime
WORKDIR /app

