# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including devDeps for build)
RUN npm ci

# Copy source
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:18-alpine AS production

WORKDIR /app

# Cài thêm dumb-init để handle signals đúng cách
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Chỉ install production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled code từ builder
COPY --from=builder /app/dist ./dist

# Copy wallet setup script (dùng khi cần enroll)
COPY src/modules/blockchain/fabric/wallet-setup.js ./src/modules/blockchain/fabric/wallet-setup.js

# Copy fabric connection profile template
COPY fabric/ ./fabric/

# Tạo thư mục wallet
RUN mkdir -p wallet

# Non-root user (bảo mật)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health 2>/dev/null || exit 1

# Start với dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
