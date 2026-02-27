# Transparent Donation System Backend

Hệ thống quyên góp minh bạch kết hợp **NestJS**, **MongoDB** và **Hyperledger Fabric** — đảm bảo mọi giao dịch tài chính được ghi lên blockchain bất biến, có thể kiểm toán bất kỳ lúc nào.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API Framework | NestJS + TypeScript |
| Database | MongoDB (Mongoose) |
| Blockchain | Hyperledger Fabric v2.5 |
| Authentication | JWT + bcrypt |
| API Docs | Swagger / OpenAPI |
| Runtime | Node.js 18+ |

## Tính năng

- 🔐 **Xác thực người dùng** — JWT, phân quyền theo role (USER / AUDITOR / ADMIN)
- 🏢 **Quản lý Tổ chức** — CRUD với xác minh đa cấp, ghi nhận on-chain
- 📢 **Chiến dịch Gây quỹ** — Tạo bởi user đã verified, theo dõi tiến độ
- 💰 **Quyên góp** — Không cần đăng nhập, tùy chọn ẩn danh, ghi blockchain
- ✅ **Hệ thống Xác minh** — Auditor duyệt tổ chức/chiến dịch, lưu on-chain
- 📊 **Audit Trail** — Lịch sử bất biến từ Hyperledger Fabric với txId thật
- 👮 **Admin Dashboard** — Thống kê tổng quan, quản lý user

---

## Kiến trúc Blockchain

```
Client Request
      │
      ▼
NestJS Backend ──── MongoDB (off-chain state)
      │
      ▼
BlockchainService
      │
      ├─── MOCK mode    → In-memory (dev nhanh)
      └─── PRODUCTION   → Hyperledger Fabric
                              │
                        ┌─────┴─────┐
                    peer0.org1   peer0.org2
                        └─────┬─────┘
                          orderer
                              │
                         Ledger (immutable)
```

**Dữ liệu ghi on-chain:**
- `createOrganization` → khi tổ chức được tạo
- `verifyOrganization` → khi auditor duyệt
- `createCampaign` → khi chiến dịch được tạo (kể cả không có org)
- `verifyCampaign` → khi auditor duyệt
- `recordDonation` → mỗi khoản quyên góp

---

## Cài đặt Nhanh (Mock Mode)

```bash
# 1. Clone & install
git clone <repository-url>
cd Charity-Be-ver2
npm install

# 2. Cấu hình môi trường
cp .env.example .env
# Sửa .env: BLOCKCHAIN_MODE=mock

# 3. Seed dữ liệu mẫu
npm run seed:db

# 4. Chạy server
npm run start:dev
# → http://localhost:8080/api
```

---

## Cài đặt Production (Hyperledger Fabric)

### Yêu cầu
- WSL2 (Ubuntu) với Docker Desktop
- Node.js 18+ trong WSL2
- [fabric-samples](https://github.com/hyperledger/fabric-samples) đã clone tại `~/fabric-samples`
- Fabric binaries đã cài (xem [hướng dẫn](https://hyperledger-fabric.readthedocs.io/en/latest/install.html))

### Bước 1 — Khởi động Fabric Test Network

```bash
# Trong WSL2
cd ~/fabric-samples/test-network
./network.sh up createChannel -c mychannel -ca
```

### Bước 2 — Deploy Chaincode

```bash
cd ~/Charity-Be-ver2   # hoặc /mnt/d/22021184/Charity-Be-ver2

export FABRIC_SAMPLES_PATH=$HOME/fabric-samples
./scripts/deploy-chaincode.sh
```

### Bước 3 — Enroll Users vào Wallet

```bash
node src/modules/blockchain/fabric/wallet-setup.js
```

Output thành công:
```
✅ Wallet setup hoàn tất!
   ✓ admin
   ✓ appUser
```

### Bước 4 — Cấu hình .env

```env
BLOCKCHAIN_MODE=production
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=charity-chaincode

# Trỏ thẳng vào WSL test-network (luôn dùng cert mới nhất)
FABRIC_WALLET_PATH=./wallet
FABRIC_CONNECTION_PROFILE=\\wsl.localhost\Ubuntu\home\<username>\fabric-samples\test-network\organizations\peerOrganizations\org1.example.com\connection-org1.json

FABRIC_USER_ID=appUser
FABRIC_MSP_ID=Org1MSP
FABRIC_CA_NAME=ca.org1.example.com
FABRIC_ADMIN_USER=admin
FABRIC_ADMIN_PASS=adminpw
```

### Bước 5 — Chạy Backend (Windows)

```bash
npm run start:dev
```

Log thành công:
```
✅ Hyperledger Fabric gateway initialized | channel: mychannel | chaincode: charity-chaincode
```

---

## 🐳 Chạy bằng Docker (với Hyperledger Fabric)

Docker container kết nối tới Fabric network chạy trong WSL2 thông qua `host.docker.internal`.

### Bước 1 — Chuẩn bị (WSL2)

```bash
cd ~/Charity-Be-ver2

# Đảm bảo Fabric đang chạy và chaincode đã deploy
# Sau đó chạy script chuẩn bị:
./scripts/prepare-docker-fabric.sh
```

Script sẽ tự động:
- Tạo `fabric/connection-docker.json` (`localhost` → `host.docker.internal`)
- Kiểm tra wallet đã có `admin.id` và `appUser.id`

> Nếu wallet chưa có: `rm -rf wallet/ && node src/modules/blockchain/fabric/wallet-setup.js`

### Bước 2 — Build và chạy Docker (Windows)

```bash
docker compose down
docker compose build
docker compose up -d

# Xem logs
docker compose logs backend -f
```

Log thành công:
```
✅ Hyperledger Fabric gateway initialized | channel: mychannel | chaincode: charity-chaincode
Blockchain mode:   production
```

### Cách hoạt động

```
Docker container
    → peer0.org1.example.com:7051   (extra_hosts → host-gateway)
    → peer0.org2.example.com:9051   (extra_hosts → host-gateway)
    → orderer.example.com:7050      (extra_hosts → host-gateway)
         ↓ (Windows host)
    → WSL2 port forwarding
    → Fabric network containers
```

Docker `extra_hosts` map tất cả Fabric hostnames về Windows host (→ WSL2), không cần thay đổi TLS certificates.

### Các lệnh Docker thường dùng

```bash
docker compose up -d              # Chạy ngầm
docker compose down               # Dừng
docker compose down -v            # Dừng + xóa MongoDB data
docker compose logs backend -f    # Xem backend logs
docker compose logs mongodb -f    # Xem MongoDB logs
docker compose exec backend sh    # Vào shell container
docker compose exec mongodb mongosh charity  # Vào MongoDB shell
docker compose build --no-cache   # Rebuild image (sau khi sửa code)
```

> **Port conflict:** Không chạy đồng thời `npm run start:dev` và `docker compose up` — cả hai dùng port 8080.

---

## Quy trình Restart Fabric Network

Mỗi lần cần reset hoàn toàn:

```bash
# WSL2
cd ~/fabric-samples/test-network
./network.sh down && docker volume prune -f
./network.sh up createChannel -c mychannel -ca

cd ~/Charity-Be-ver2
./scripts/deploy-chaincode.sh
rm -rf wallet/ && node src/modules/blockchain/fabric/wallet-setup.js

# Windows
npm run start:dev
```

> **Tip:** Tạo symlink để không cần copy wallet:
> ```bash
> ln -s /mnt/d/22021184/Charity-Be-ver2 ~/Charity-Be-ver2
> ```

---

## API Endpoints

Swagger UI: **http://localhost:8080/api**

### Authentication
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/auth/register` | Đăng ký tài khoản | Public |
| POST | `/auth/login` | Đăng nhập, nhận JWT | Public |

### Organizations
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/organizations` | Danh sách tổ chức | Public |
| POST | `/organizations` | Tạo tổ chức mới | JWT (verified) |
| GET | `/organizations/:id` | Chi tiết tổ chức | Public |
| POST | `/organizations/:id/request-verification` | Gửi yêu cầu xác minh | JWT |
| PATCH | `/organizations/:id/verification-status` | Duyệt/từ chối | Auditor |
| GET | `/organizations/:id/audit` | **Audit trail blockchain** | Public |

### Campaigns
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/campaigns` | Danh sách chiến dịch | Public |
| POST | `/campaigns` | Tạo chiến dịch | JWT (verified) |
| PATCH | `/campaigns/:id/verification-status` | Duyệt chiến dịch | Auditor |
| GET | `/campaigns/:id/audit` | **Audit trail blockchain** | Public |

### Donations
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/donations` | Quyên góp (optional login) | Optional JWT |
| GET | `/donations/my` | Danh sách donation của tôi | JWT |
| GET | `/donations/campaign/:id` | Donations theo campaign | Public |
| GET | `/donations/:id/verify` | **Xác minh trên blockchain** | Public |

### Admin
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/admin/dashboard` | Thống kê tổng quan | Admin |
| GET | `/admin/users` | Quản lý users | Admin |
| GET | `/admin/audit/organizations/:id` | Audit org | Admin |
| GET | `/admin/audit/campaigns/:id` | Audit campaign | Admin |

---

## Phân quyền

| Role | Quyền hạn |
|------|-----------|
| **USER** | Đăng ký, xem dữ liệu, quyên góp, tạo tổ chức/campaign (sau khi verified) |
| **AUDITOR** | Tất cả quyền USER + duyệt/từ chối tổ chức, chiến dịch |
| **ADMIN** | Tất cả quyền + quản lý users, xem dashboard |

### Luồng xác minh

```
User đăng ký
    → Admin nâng role → VERIFIED
    → User tạo Organization
    → Upload legal documents
    → Gửi request verification
    → Auditor duyệt → VERIFIED (ghi on-chain)
    → Tạo Campaign → PENDING (ghi on-chain)
    → Auditor duyệt Campaign → VERIFIED (ghi on-chain)
    → Donors quyên góp (ghi on-chain)
```

---

## Cấu trúc Project

```
.
├── chaincode/charity/          # Hyperledger Fabric smart contract
│   ├── index.js                # CharityContract (JS, deterministic)
│   └── package.json
├── fabric/
│   └── connection-profile.json # Template (dùng connection-org1.json từ test-network)
├── scripts/
│   ├── deploy-chaincode.sh     # Deploy/upgrade chaincode lên Fabric
│   ├── refresh-fabric.sh       # Re-enroll wallet sau khi restart network
│   └── seed.ts                 # Seed dữ liệu mẫu MongoDB
├── src/
│   ├── common/enums/           # Shared enums (Role, VerificationStatus)
│   └── modules/
│       ├── auth/               # JWT authentication & guards
│       ├── users/              # User profile management
│       ├── organizations/      # Organization CRUD & verification
│       ├── campaigns/          # Campaign CRUD & verification
│       ├── donations/          # Donation handling
│       ├── verification/       # Verification request workflow
│       ├── admin/              # Admin dashboard
│       └── blockchain/         # Hyperledger Fabric integration
│           ├── blockchain.service.ts  # Gateway, transactions
│           └── fabric/
│               └── wallet-setup.js   # Enroll admin + appUser
├── .env.example
└── README.md
```

---

## Chaincode

Smart contract viết bằng JavaScript (Node.js), tuân thủ các quy tắc Fabric:

- ✅ **Deterministic** — Dùng `ctx.stub.getTxTimestamp()` thay vì `new Date()`
- ✅ **Idempotent** — Kiểm tra tồn tại trước khi ghi
- ✅ **Immutable records** — Donation không thể bị overwrite
- ✅ **Event emission** — Emit event cho mỗi operation

```
chaincode/charity/index.js
├── createOrganization(ctx, assetJSON)
├── verifyOrganization(ctx, orgId, adminId)
├── getOrganizationHistory(ctx, orgId)
├── createCampaign(ctx, assetJSON)
├── verifyCampaign(ctx, campaignId, adminId)
├── getCampaignHistory(ctx, campaignId)
├── recordDonation(ctx, assetJSON)
├── getDonationHistory(ctx, donationId)
└── getCampaignDonations(ctx, campaignId)
```

---

## Scripts

```bash
npm run start:dev       # Dev với hot reload
npm run build           # Build production
npm run start:prod      # Chạy production build
npm run test            # Unit tests
npm run lint            # ESLint
npm run seed:db         # Seed dữ liệu mẫu
npm run blockchain:setup  # Enroll wallet (= node wallet-setup.js)
```

---

## Tài khoản mẫu (sau seed:db)

| Email | Password | Role |
|-------|----------|------|
| admin@charity.com | Admin123! | ADMIN |
| auditor@charity.com | Password123! | AUDITOR |
| org1@helpinghands.org | Password123! | USER (verified) |
| donor1@gmail.com | Password123! | USER (verified) |

---

## License

MIT
