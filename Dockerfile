FROM node:20-slim

RUN apt-get update && apt-get install -y openssl

COPY . /app
WORKDIR /app

RUN mkdir -p node_modules/.cache && chmod -R 777 node_modules/.cache

RUN yarn install
