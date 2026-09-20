FROM node:20-slim

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install npm dependencies
RUN npm ci

# Copy application source code
COPY . .

EXPOSE 3000

# Start server
CMD ["npm", "run", "dev"]
