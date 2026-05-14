#!/usr/bin/env bash
# =============================================================
# fabric-vm-setup.sh
#
# Setup Fabric 2.5 test-network trên GCP VM mới.
# Chạy tự động via GCE startup script.
# =============================================================

set -e

FABRIC_VERSION="2.5.9"
CA_VERSION="1.5.11"
export HOME="/root"
export PATH="$HOME/fabric-samples/bin:$PATH"
FABRIC_DIR="$HOME/fabric-samples"
CHAINCODE_DIR="$HOME/charity-chaincode"

echo "═══════════════════════════════════════════════════"
echo "  Fabric VM Setup — $(hostname) — $(date)"
echo "═══════════════════════════════════════════════════"

# ─── 1. Cài đặt base packages ─────────────────────────────────────────────────
echo ""
echo "📦 Cài packages..."
apt-get update -qq
apt-get install -y -qq \
    apt-transport-https ca-certificates curl gnupg lsb-release \
    unzip git mc htop jq

# Upgrade Docker lên phiên bản mới để hỗ trợ Fabric chaincode builder
echo "📦 Cài Docker mới..."
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --batch --yes --dearmor -o /usr/share/keyrings/docker-ce.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-ce.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker-ce.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl start docker || true
systemctl enable docker || true
echo "✅ Docker: $(docker --version)"

# ─── 2. Cài Node.js 18 + Go ───────────────────────────────────────────────────
echo ""
echo "📦 Cài Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y -qq nodejs
echo "✅ Node: $(node --version), npm: $(npm --version)"

echo ""
echo "📦 Cài Go..."
GO_VERSION="1.22.4"
GO_ARCHIVE="go${GO_VERSION}.linux-amd64.tar.gz"
curl -fsSL "https://go.dev/dl/${GO_ARCHIVE}" -o /tmp/go.tar.gz
rm -rf /usr/local/go
tar -xzf /tmp/go.tar.gz -C /usr/local
rm -f /tmp/go.tar.gz
export PATH="/usr/local/go/bin:$PATH"
echo "✅ Go: $(go version)"

# Thêm Go vào PATH cho các bước tiếp theo
echo 'export PATH="/usr/local/go/bin:$PATH"' >> ~/.bashrc

# ─── 3. Tải Fabric binaries + config ─────────────────────────────────────────
echo ""
echo "🔧 Tải Fabric binaries v$FABRIC_VERSION..."

# Xóa fabric-samples cũ
rm -rf "$FABRIC_DIR" /fabric-samples
mkdir -p "$FABRIC_DIR"

# Tải binary release (chứa cả bin/ và config/)
cd "$FABRIC_DIR"
FABRIC_ARCHIVE="hyperledger-fabric-linux-amd64-${FABRIC_VERSION}.tar.gz"
CA_ARCHIVE="hyperledger-fabric-ca-linux-amd64-${CA_VERSION}.tar.gz"

echo "📥 Tải $FABRIC_ARCHIVE..."
curl -sSL "https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/${FABRIC_ARCHIVE}" \
    -o /tmp/fabric.tar.gz
echo "📦 Extract..."
tar -xzf /tmp/fabric.tar.gz
rm -f /tmp/fabric.tar.gz

echo "📥 Tải CA: $CA_ARCHIVE..."
curl -sSL "https://github.com/hyperledger/fabric-ca/releases/download/v${CA_VERSION}/${CA_ARCHIVE}" \
    -o /tmp/fabric-ca.tar.gz
tar -xzf /tmp/fabric-ca.tar.gz
rm -f /tmp/fabric-ca.tar.gz

echo "✅ bin/ contents: $(ls bin/ | wc -l) files"
echo "✅ config/ contents: $(ls config/ | wc -l) files"
echo "✅ peer: $(peer version 2>/dev/null | head -1)"
echo "✅ fabric-ca: $(fabric-ca-server version 2>/dev/null | head -1)"

# ─── 4. Clone fabric-samples (test-network scripts) ───────────────────────────
echo ""
echo "🔗 Clone test-network..."
if [ ! -d "$FABRIC_DIR/test-network" ]; then
    git clone -q --depth 1 --branch main \
        https://github.com/hyperledger/fabric-samples.git "$FABRIC_DIR/fabric-samples-temp"
    mv "$FABRIC_DIR/fabric-samples-temp/test-network" "$FABRIC_DIR/test-network"
    mv "$FABRIC_DIR/fabric-samples-temp/scripts" "$FABRIC_DIR/scripts" 2>/dev/null || true
    rm -rf "$FABRIC_DIR/fabric-samples-temp"
fi
ls "$FABRIC_DIR/test-network/"

# ─── 5. Bootstrap test-network ────────────────────────────────────────────────
echo ""
echo "🚀 Khởi động Fabric test-network..."
cd "$FABRIC_DIR/test-network"

export FABRIC_CFG_PATH="$FABRIC_DIR/config"

# Tắt network cũ + xóa volumes để clean slate
echo "Tắt network cũ và xóa volumes..."
docker-compose -f docker/docker-compose-test-net.yaml down -v 2>/dev/null || true
./network.sh down 2>/dev/null || true
# Xóa hết volumes liên quan đến fabric
docker volume ls -q | grep -E "fabric|test-net|org" | xargs -r docker volume rm -f 2>/dev/null || true

echo "Tạo network với channel 'mychannel'..."
./network.sh up createChannel -c mychannel -ca 2>&1 | tail -20

sleep 10
echo "✅ Containers đang chạy:"
docker ps --format "  {{.Names}}: {{.Status}}" | grep -E "peer0|orderer|ca"

# ─── 5b. Enroll wallet trên VM mới ─────────────────────────────────────────────
echo ""
echo "👛 Enroll wallet trên VM..."

# CA cert path — từ bootstrap script
export FABRIC_CA_CLIENT_HOME="$FABRIC_DIR/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com"
export FABRIC_CA_CLIENT_TLS_CERTFILES="$FABRIC_DIR/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"

APP_USER="appUser"
WALLET_DIR="$FABRIC_DIR/test-network/wallet"
mkdir -p "$WALLET_DIR"

# Register appUser (chờ CA sẵn sàng)
echo "Registering $APP_USER..."
for i in 1 2 3 4 5 6 7 8 9 10; do
    fabric-ca-client register \
        -u "https://localhost:7054" \
        --id.name "$APP_USER" --id.secret "appuserpw" --id.type client 2>&1 | tail -2 && break
    echo "CA chưa sẵn sàng, thử lại ($i)..."
    sleep 3
done

# Enroll appUser
echo "Enrolling $APP_USER..."
fabric-ca-client enroll \
    -u "https://${APP_USER}:appuserpw@localhost:7054" \
    --mspdir "$WALLET_DIR/appUser" 2>&1 | tail -5

echo "✅ Wallet enrolled:"
ls "$WALLET_DIR/"

# Tạo identity file cho Node.js SDK (FileSystemWallet format)
CERT_FILE=$(ls "$WALLET_DIR/appUser/msp/signcerts/" 2>/dev/null | head -1)
KEY_FILE=$(ls "$WALLET_DIR/appUser/msp/keystore/" 2>/dev/null | head -1)

if [ -n "$CERT_FILE" ] && [ -n "$KEY_FILE" ]; then
    python3 -c "
import json

with open('$WALLET_DIR/appUser/msp/signcerts/$CERT_FILE', 'r') as f:
    cert = f.read()
with open('$WALLET_DIR/appUser/msp/keystore/$KEY_FILE', 'r') as f:
    key = f.read()

wallet = {
    'credentials': {'certificate': cert, 'privateKey': key},
    'mspid': 'Org1MSP',
    'type': 'X.509'
}
with open('$WALLET_DIR/appUser.id', 'w') as f:
    json.dump(wallet, f)
print('Wallet created: $WALLET_DIR/appUser.id')
"
    echo "✅ Wallet appUser.id created"
else
    echo "❌ Certificate or key file not found"
    ls -la "$WALLET_DIR/appUser/msp/" 2>/dev/null || echo "MSP dir not found"
    ls -la "$WALLET_DIR/appUser/" 2>/dev/null || echo "appUser dir not found"
fi

echo "=== WALLET_CONTENTS ==="
find "$WALLET_DIR" -type f 2>/dev/null | head -20
echo "=== WALLET_END ==="

# ─── 6. Deploy charity chaincode ────────────────────────────────────────────────
echo ""
echo "📜 Deploy charity-chaincode..."

# Clone repo để lấy chaincode
rm -rf "$HOME/charity-be-temp" "$CHAINCODE_DIR" 2>/dev/null || true
git clone -q --depth 1 https://github.com/hungsinh2k4/Charity-Be-ver2.git "$HOME/charity-be-temp"
if [ -d "$HOME/charity-be-temp/chaincode/charity" ]; then
    cp -r "$HOME/charity-be-temp/chaincode/charity" "$CHAINCODE_DIR"
fi
rm -rf "$HOME/charity-be-temp"

if [ ! -d "$CHAINCODE_DIR" ]; then
    echo "❌ Không tìm thấy chaincode!"
    exit 1
fi

cd "$CHAINCODE_DIR"
npm install --omit=dev 2>&1 | tail -3

# Setup env vars cho peer commands
export PATH="/usr/local/go/bin:$FABRIC_DIR/bin:$PATH"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$FABRIC_DIR/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$FABRIC_DIR/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS="localhost:7051"
export ORDERER_CA="$FABRIC_DIR/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

cd "$FABRIC_DIR/test-network"

# Package chaincode
echo "Packaging chaincode..."
export PATH="/usr/local/go/bin:$FABRIC_DIR/bin:$PATH"
peer lifecycle chaincode package charity-chaincode.tar.gz \
    --path "$CHAINCODE_DIR" \
    --label charity-chaincode \
    --lang node 2>&1 | tail -3

# Install on peer0
echo "Installing on peer0..."
peer lifecycle chaincode install charity-chaincode.tar.gz 2>&1 | tail -3

# Get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json 2>/dev/null | jq -r '.installed_chaincodes[0].package_id')
echo "✅ Package ID: $PACKAGE_ID"

# Approve chaincode for Org1 (bỏ --orderer vì peer tự dùng anchor)
echo "Approve chaincode for Org1..."
peer lifecycle chaincode approveformyorg \
    --tls --cafile "$ORDERER_CA" \
    --channelID mychannel \
    --name charity-chaincode \
    --version 1.0 \
    --package-id "$PACKAGE_ID" \
    --sequence 1 \
    --signature-policy "OR('Org1MSP.member')" \
    --init-required 2>&1 | tail -10

sleep 5

# Check trạng thái trước commit
echo "Check committed chaincode definitions..."
peer lifecycle chaincode querycommitted \
    --channelID mychannel \
    --name charity-chaincode 2>&1 || echo "Chưa có chaincode committed"

echo "Commit chaincode..."
peer lifecycle chaincode commit \
    --tls --cafile "$ORDERER_CA" \
    --channelID mychannel \
    --name charity-chaincode \
    --version 1.0 \
    --sequence 1 \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "$CORE_PEER_TLS_ROOTCERT_FILE" \
    --signature-policy "OR('Org1MSP.member')" \
    --init-required 2>&1 | tail -10

echo "✅ Chaincode committed!"

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Fabric setup hoàn tất!"
echo "VM IP: $(hostname -I | awk '{print $1}')"
echo "═══════════════════════════════════════════════════"
