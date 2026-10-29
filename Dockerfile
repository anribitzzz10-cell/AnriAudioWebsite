FROM node:22.23.4-alpine
WORKDIR /app
COPY . .
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.cjs"]
