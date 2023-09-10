FROM node:20.6.0-alpine3.18

WORKDIR /app

COPY . /app

RUN yarn 
RUN yarn build

EXPOSE 3333

CMD ["yarn", "start"]