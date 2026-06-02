# Stage 1: Build the React frontend
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN cd server && npm install && cd ..
RUN npm run build

# Stage 2: Setup the production server
FROM node:20-slim

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/
# Copy frontend build
COPY --from=builder /app/dist ./dist

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "index.js"]
