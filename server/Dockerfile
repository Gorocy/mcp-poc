FROM node as installer
WORKDIR /app
COPY . .

FROM installer as builder
WORKDIR /app
RUN npm run build

FROM builder as runtime
WORKDIR /app