FROM node:20.13-alpine as base

FROM base as deps

WORKDIR /app

ADD package.json ./
ADD yarn.lock ./

RUN yarn install --frozen-lockfile

FROM base as build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

ADD . .
RUN yarn build

FROM base as release
ENV NODE_ENV="production"

# RUN addgroup -g 1000 app \
#     && adduser -G app -u 1000 app -D

WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["yarn", "start"]
