FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY nginx.conf           /etc/nginx/conf.d/default.conf
COPY app/index.html       /usr/share/nginx/html/index.html
COPY app/lib.js           /usr/share/nginx/html/lib.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

ENV APP_NAME="my app"
ENV APP_VERSION="1.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
