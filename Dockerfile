FROM node:20-slim

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install npm dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build Vite frontend and server bundle
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
