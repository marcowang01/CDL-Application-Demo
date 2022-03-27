# fetches nginx official image from docker hub
FROM nginx:1.17.10-alpine 
# imports dependencies
RUN apk add nano && apk add curl

COPY ./index.html /usr/share/nginx/html
# removes default Nginx conf file
RUN rm -rf /etc/nginx/conf.d/default.conf
# adds custom conf file to conf.d folder
COPY ./nginx.conf /etc/nginx/conf.d

EXPOSE 80