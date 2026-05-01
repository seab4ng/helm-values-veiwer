FROM node:22-alpine AS vendor
WORKDIR /build
RUN npm install --omit=dev js-yaml@4.1.0

FROM nginx:1.27-alpine

LABEL maintainer="Yakir Veneci" \
      org.opencontainers.image.authors="Yakir Veneci" \
      org.opencontainers.image.url="https://github.com/seab4ng" \
      org.opencontainers.image.source="https://github.com/seab4ng/helm-values-veiwer"

RUN apk upgrade --no-cache && \
    rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY nginx.conf           /etc/nginx/conf.d/default.conf
COPY app/index.html       /usr/share/nginx/html/index.html
COPY app/lib.js           /usr/share/nginx/html/lib.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=vendor /build/node_modules/js-yaml/dist/js-yaml.min.js \
                   /usr/share/nginx/html/vendor/js-yaml.min.js

RUN chmod +x /docker-entrypoint.sh && \
    chmod -R 644 /usr/share/nginx/html && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} +

EXPOSE 8080

ARG BUILD_VERSION=none
ENV APP_VERSION=$BUILD_VERSION

ENTRYPOINT ["/docker-entrypoint.sh"]
