FROM node:20-slim AS app

WORKDIR /app

# Copy package definition and install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy application source
COPY . .

EXPOSE 5173 4173

CMD ["npm", "run", "docs:dev", "--", "--host", "0.0.0.0"]

# Static site builder stage for production deployment
FROM app AS site-builder

RUN npm run docs:build
