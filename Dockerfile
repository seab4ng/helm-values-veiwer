FROM node:22-alpine AS vendor
WORKDIR /build
RUN npm install js-yaml@4.1.0

FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY nginx.conf           /etc/nginx/conf.d/default.conf
COPY app/index.html       /usr/share/nginx/html/index.html
COPY app/lib.js           /usr/share/nginx/html/lib.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=vendor /build/node_modules/js-yaml/dist/js-yaml.min.js \
                   /usr/share/nginx/html/vendor/js-yaml.min.js

RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

ARG BUILD_VERSION=none
ENV APP_NAME="my app"
ENV APP_VERSION=$BUILD_VERSION

ENTRYPOINT ["/docker-entrypoint.sh"]
