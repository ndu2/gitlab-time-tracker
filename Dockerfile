FROM node:24.18.0-alpine3.23

RUN addgroup -S gtt && adduser -S gtt -G gtt
USER gtt
WORKDIR /home/gtt
COPY dist/gtt.cjs /home/gtt/gtt.cjs
VOLUME ["/home/gtt"]
ENTRYPOINT ["node", "gtt.cjs"]
CMD ["--help"]
