FROM node:16.13-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production=false
COPY . ./
RUN npm run build
RUN rm -rf node_modules/

FROM node:16.13-alpine AS runner
WORKDIR /usr/src/app
RUN chown node:node ./
USER node
ENV NODE_ENV production
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /usr/src/app ./
CMD npm start