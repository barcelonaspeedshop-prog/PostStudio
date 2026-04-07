FROM node:20-alpine AS base

# Install ffmpeg for video export
RUN apk add --no-cache ffmpeg

# Create data directory for persistent token storage
RUN mkdir -p /data

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
