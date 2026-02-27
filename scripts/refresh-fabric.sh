#!/usr/bin/env bash
# =============================================================
# refresh-fabric.sh
#
# Chạy sau mỗi lần restart Fabric test-network:
#   ./scripts/refresh-fabric.sh
#
# Chỉ cần enroll lại wallet vì connection profile được load
# trực tiếp từ WSL test-network (luôn fresh).
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "═══════════════════════════════════════════════════"
echo "  Fabric Test-Network Refresh"
echo "═══════════════════════════════════════════════════"

# Kiểm tra Fabric network đang chạy
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

# Kiểm tra connection-org1.json tồn tại (auto-generated bởi test-network)
CONN_FILE="$HOME/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
if [ ! -f "$CONN_FILE" ]; then
  echo "❌ connection-org1.json không tồn tại: $CONN_FILE"
  echo "   Hãy chạy: ./network.sh up createChannel -c mychannel -ca"
  exit 1
fi
echo "✅ Connection profile: $CONN_FILE"

# Enroll lại wallet (CA mới sau mỗi lần network restart)
echo ""
echo "👤 Enroll lại wallet..."
cd "$PROJECT_DIR"
rm -rf wallet/
node src/modules/blockchain/fabric/wallet-setup.js

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Refresh hoàn tất!"
echo ""
echo "Bây giờ khởi động lại backend:"
echo "  npm run start:dev   (từ Windows terminal)"
echo "═══════════════════════════════════════════════════"
