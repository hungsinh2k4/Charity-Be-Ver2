#!/usr/bin/env bash
# =============================================================
# prepare-docker-fabric.sh
#
# Tạo connection profile và copy wallet cho Docker.
# Docker container dùng host.docker.internal thay vì localhost
# để reach Fabric network chạy trong WSL2.
#
# Chạy trong WSL2 sau khi ./network.sh up:
#   ./scripts/prepare-docker-fabric.sh
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Đường dẫn Windows (qua /mnt/d/...)
WIN_PROJECT="/mnt/d/22021184/Charity-Be-ver2"

echo "═══════════════════════════════════════════════════"
echo "  Prepare Fabric for Docker"
echo "═══════════════════════════════════════════════════"

# 1. Kiểm tra Fabric network đang chạy
echo ""
echo "🔍 Kiểm tra Fabric containers..."
RUNNING=$(docker ps --format "{{.Names}}" | grep -E "peer0|orderer" | wc -l)
if [ "$RUNNING" -lt 2 ]; then
  echo "❌ Fabric network chưa chạy! Khởi động trước:"
  echo "   cd ~/fabric-samples/test-network"
  echo "   ./network.sh up createChannel -c mychannel -ca"
  exit 1
fi
echo "✅ $RUNNING Fabric containers đang chạy"

# 2. Kiểm tra connection-org1.json tồn tại
SRC_PROFILE="$HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
if [ ! -f "$SRC_PROFILE" ]; then
  echo "❌ Không tìm thấy connection-org1.json"
  exit 1
fi

# 3. Tạo connection-docker.json: thay localhost → host.docker.internal
echo ""
echo "📄 Tạo connection-docker.json (localhost → host.docker.internal)..."
DEST_PROFILE="$WIN_PROJECT/fabric/connection-docker.json"
sed 's/localhost/host.docker.internal/g' "$SRC_PROFILE" > "$DEST_PROFILE"
echo "✅ Đã tạo: fabric/connection-docker.json"

# 4. Kiểm tra wallet (do symlink, wallet đã nằm tại Windows folder)
echo ""
echo "👛 Kiểm tra wallet..."
WALLET_PATH="$WIN_PROJECT/wallet"

if [ ! -d "$WALLET_PATH" ] || [ -z "$(ls -A $WALLET_PATH 2>/dev/null)" ]; then
  echo "❌ Wallet chưa có! Chạy trước:"
  echo "   cd ~/Charity-Be-ver2"
  echo "   rm -rf wallet/ && node src/modules/blockchain/fabric/wallet-setup.js"
  exit 1
fi

echo "✅ Wallet OK:"
ls "$WALLET_PATH"

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Chuẩn bị xong! Bây giờ chạy Docker với Fabric:"
echo ""
echo "  BLOCKCHAIN_MODE=production docker compose up -d"
echo ""
echo "  hoặc tạo .env.docker:"
echo "  echo 'BLOCKCHAIN_MODE=production' > .env.docker"
echo "  docker compose --env-file .env.docker up -d"
echo "═══════════════════════════════════════════════════"
