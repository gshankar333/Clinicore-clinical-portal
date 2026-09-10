FROM node:20-alpine

WORKDIR /backend

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src
COPY db ./db

EXPOSE 4000

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "src/server.js"]
