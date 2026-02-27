#!/usr/bin/env bash
# =============================================================================
# deploy-chaincode.sh
#
# Script deploy charity chaincode lên Hyperledger Fabric Test Network
# Yêu cầu: fabric-samples đã clone và test-network đã chạy
#
# Cách dùng:
#   chmod +x scripts/deploy-chaincode.sh
#   ./scripts/deploy-chaincode.sh
# =============================================================================

set -e

# ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
CHAINCODE_NAME="charity-chaincode"
CHAINCODE_PATH="$(pwd)/chaincode/charity"
CHANNEL_NAME="mychannel"
CHAINCODE_VERSION="1.1"
CHAINCODE_SEQUENCE="2"

# Đường dẫn đến fabric-samples/test-network
# Thay đổi theo đường dẫn trên máy của bạn
FABRIC_SAMPLES_PATH="${FABRIC_SAMPLES_PATH:-$HOME/fabric-samples}"
TEST_NETWORK_PATH="$FABRIC_SAMPLES_PATH/test-network"

# ─── KIỂM TRA MÔI TRƯỜNG ─────────────────────────────────────────────────────
echo "🔍 Kiểm tra môi trường..."

if [ ! -d "$TEST_NETWORK_PATH" ]; then
  echo "❌ Không tìm thấy test-network tại: $TEST_NETWORK_PATH"
  echo "   Hãy clone fabric-samples: git clone https://github.com/hyperledger/fabric-samples.git $HOME/fabric-samples"
  echo "   Sau đó export FABRIC_SAMPLES_PATH=/path/to/fabric-samples"
  exit 1
fi

if [ ! -d "$CHAINCODE_PATH" ]; then
  echo "❌ Không tìm thấy chaincode tại: $CHAINCODE_PATH"
  exit 1
fi

# ─── CÀI DEPENDENCIES CHAINCODE ──────────────────────────────────────────────
echo "📦 Cài dependencies cho chaincode..."
cd "$CHAINCODE_PATH"
npm install
cd -

# ─── SETUP BIẾN MÔI TRƯỜNG FABRIC ────────────────────────────────────────────
export PATH="$FABRIC_SAMPLES_PATH/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_SAMPLES_PATH/config/"
export CORE_PEER_TLS_ENABLED=true

# Org1 peer
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$TEST_NETWORK_PATH/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$TEST_NETWORK_PATH/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS="localhost:7051"

ORDERER_CA="$TEST_NETWORK_PATH/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# ─── PACKAGE CHAINCODE ───────────────────────────────────────────────────────
echo "📦 Packaging chaincode '$CHAINCODE_NAME'..."
peer lifecycle chaincode package "${CHAINCODE_NAME}.tar.gz" \
  --path "$CHAINCODE_PATH" \
  --lang node \
  --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

# ─── INSTALL TRÊN ORG1 ───────────────────────────────────────────────────────
echo "🔧 Installing chaincode trên Org1..."
peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz" 2>&1 | \
  grep -v "already successfully installed" || true

# Lấy package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled 2>/dev/null | \
  grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | \
  awk '{print $3}' | tr -d ',')

if [ -z "$PACKAGE_ID" ]; then
  echo "❌ Không lấy được Package ID!"
  exit 1
fi
echo "📋 Package ID: $PACKAGE_ID"

# ─── INSTALL TRÊN ORG2 ───────────────────────────────────────────────────────
echo "🔧 Installing chaincode trên Org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$TEST_NETWORK_PATH/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$TEST_NETWORK_PATH/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp"
export CORE_PEER_ADDRESS="localhost:9051"

peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz"

# ─── APPROVE - Org2 ──────────────────────────────────────────────────────────
echo "✅ Approving chaincode từ Org2..."
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID "$CHANNEL_NAME" \
  --name "$CHAINCODE_NAME" \
  --version "$CHAINCODE_VERSION" \
  --package-id "$PACKAGE_ID" \
  --sequence "$CHAINCODE_SEQUENCE" \
  --tls --cafile "$ORDERER_CA"

# ─── APPROVE - Org1 ──────────────────────────────────────────────────────────
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$TEST_NETWORK_PATH/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$TEST_NETWORK_PATH/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS="localhost:7051"

echo "✅ Approving chaincode từ Org1..."
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID "$CHANNEL_NAME" \
  --name "$CHAINCODE_NAME" \
  --version "$CHAINCODE_VERSION" \
  --package-id "$PACKAGE_ID" \
  --sequence "$CHAINCODE_SEQUENCE" \
  --tls --cafile "$ORDERER_CA"

# ─── COMMIT ──────────────────────────────────────────────────────────────────
echo "🚀 Committing chaincode lên channel '$CHANNEL_NAME'..."
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID "$CHANNEL_NAME" \
  --name "$CHAINCODE_NAME" \
  --version "$CHAINCODE_VERSION" \
  --sequence "$CHAINCODE_SEQUENCE" \
  --tls --cafile "$ORDERER_CA" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "$TEST_NETWORK_PATH/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "$TEST_NETWORK_PATH/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"

# ─── VERIFY ──────────────────────────────────────────────────────────────────
echo "🔍 Kiểm tra chaincode đã commit..."
peer lifecycle chaincode querycommitted \
  --channelID "$CHANNEL_NAME" \
  --name "$CHAINCODE_NAME"

echo ""
echo "✅ Deploy chaincode '$CHAINCODE_NAME' thành công!"
echo ""
echo "─── BƯỚC TIẾP THEO ─────────────────────────────────────────────────────"
echo "1. Cập nhật fabric/connection-profile.json với TLS certificates từ:"
echo "   $TEST_NETWORK_PATH/organizations/"
echo ""
echo "2. Setup wallet (enroll users):"
echo "   npx ts-node -r tsconfig-paths/register src/modules/blockchain/fabric/wallet-helper.ts"
echo ""
echo "3. Cập nhật .env:"
echo "   BLOCKCHAIN_MODE=production"
echo ""
echo "4. Khởi động backend:"
echo "   npm run start:dev"
