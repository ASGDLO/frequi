FROM node:21.5.0-alpine as ui-builder

RUN mkdir /app

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml /app/
COPY .yarn/releases/ /app/.yarn/releases/

RUN apk add --update --no-cache python3 g++ make\
    && yarn install\
    && apk del python3 g++ make

COPY . /app

RUN yarn build

FROM nginx:1.25.3-alpine
COPY  --from=ui-builder /app/dist /etc/nginx/html
COPY  --from=ui-builder /app/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx"]
