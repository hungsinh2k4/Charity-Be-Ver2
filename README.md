# Transparent Donation System Backend

Hệ thống quyên góp minh bạch kết hợp **NestJS**, **MongoDB** và **Hyperledger Fabric** — đảm bảo mọi giao dịch tài chính được ghi lên blockchain bất biến, có thể kiểm toán bất kỳ lúc nào.

Tích hợp **QR Code VietQR** chuẩn EMV, cho phép donor quét mã → chuyển khoản ngân hàng → hệ thống đối soát tự động theo mã tham chiếu.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API Framework | NestJS + TypeScript |
| Database | MongoDB (Mongoose) |
| Blockchain | Hyperledger Fabric v2.5 |
| Authentication | JWT + bcrypt |
| QR Code | VietQR / EMV QR (chuẩn NAPAS 247) |
| API Docs | Swagger / OpenAPI |
| Runtime | Node.js 18+ |

## Tính năng

- 🔐 **Xác thực người dùng** — JWT, phân quyền theo role (USER / AUDITOR / ADMIN)
- 🏢 **Quản lý Tổ chức** — CRUD với xác minh đa cấp, ghi nhận on-chain
- 📢 **Chiến dịch Gây quỹ** — Tạo bởi user đã verified, theo dõi tiến độ
- 🔳 **QR Code VietQR** — Tự động sinh QR chuyển khoản ngân hàng chuẩn EMV, có mã đối soát
- 💰 **Quyên góp** — Không cần đăng nhập, tùy chọn ẩn danh, ghi blockchain
- ✅ **Hệ thống Xác minh** — Auditor duyệt tổ chức/chiến dịch, lưu on-chain
- 📊 **Audit Trail** — Lịch sử bất biến từ Hyperledger Fabric với txId thật
- 👮 **Admin Dashboard** — Thống kê tổng quan, quản lý user

---

## Kiến trúc Donation + QR

```
Donor                          Backend                      Chủ quỹ
  │                               │                            │
  │  POST /donations               │                            │
  │  { campaignId, amount }       │                            │
  │ ─────────────────────────────▶│                            │
  │                               │─ sinh transferCode         │
  │  { transferCode: "DONAB12" }  │   (mã nội dung CK)        │
  │ ◀─────────────────────────────│                            │
  │                               │                            │
  │  GET /donations/:id/payment-qr│                            │
  │ ─────────────────────────────▶│                            │
  │                               │─ tìm bankInfo:             │
  │                               │   Campaign → Org → User    │
  │  { QR image, bankInfo,        │                            │
  │    transferCode, amount }     │                            │
  │ ◀─────────────────────────────│                            │
  │                               │                            │
  │  [Quét QR → CK ngân hàng]     │              [Xem TK NH]  │
  │  nội dung: "DONAB12"          │                            │
  │                               │                            │
  │                               │  POST /donations/confirm/DONAB12
  │                               │◀───────────────────────────│
  │                               │─ xác nhận, cộng tiền       │
  │                               │  vào campaign              │
```

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
- `recordDonation` → mỗi khoản quyên góp (trạng thái PENDING)

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
FRONTEND_URL=http://localhost:3000

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
| POST | `/auth/register` | Đăng ký tài khoản (có thể kèm bankInfo) | Public |
| POST | `/auth/login` | Đăng nhập, nhận JWT | Public |

### Users
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/users/me` | Thông tin user hiện tại | JWT |
| PATCH | `/users/me` | Cập nhật profile & bankInfo | JWT |
| POST | `/users/request-verification` | Gửi yêu cầu xác minh CCCD | JWT |

### Organizations
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/organizations` | Danh sách tổ chức | Public |
| POST | `/organizations` | Tạo tổ chức mới (có thể kèm bankInfo) | JWT (verified) |
| GET | `/organizations/:id` | Chi tiết tổ chức | Public |
| PATCH | `/organizations/:id` | Cập nhật thông tin & bankInfo | JWT (owner) |
| POST | `/organizations/:id/request-verification` | Gửi yêu cầu xác minh | JWT |
| PATCH | `/organizations/:id/verification-status` | Duyệt/từ chối | Auditor |
| GET | `/organizations/:id/audit` | **Audit trail blockchain** | Public |

### Campaigns
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/campaigns` | Danh sách chiến dịch | Public |
| POST | `/campaigns` | Tạo chiến dịch (có thể kèm bankInfo riêng) | JWT (verified) |
| PATCH | `/campaigns/:id` | Cập nhật thông tin & bankInfo | JWT (creator) |
| PATCH | `/campaigns/:id/verification-status` | Duyệt chiến dịch | Auditor |
| GET | `/campaigns/:id/audit` | **Audit trail blockchain** | Public |

### Donations & QR
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/donations` | Tạo donation → nhận `transferCode` | Optional JWT |
| GET | `/donations/:id/payment-qr` | **Lấy QR VietQR** để chuyển khoản | Public |
| GET | `/donations/:id/payment-qr/image` | Ảnh QR PNG trực tiếp | Public |
| GET | `/donations/lookup/:transferCode` | Tra cứu donation theo mã CK | Public |
| POST | `/donations/confirm/:transferCode` | **Admin xác nhận** đã nhận CK | JWT (Admin) |
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

## 🔳 Tích hợp QR VietQR

### Chuẩn kỹ thuật
QR Code được sinh theo **chuẩn EMV QR / VietQR (NAPAS 247)**, tương thích với tất cả app ngân hàng Việt Nam (MB Bank, Vietcombank, BIDV, Techcombank, v.v.) — không cần thư viện phía client.

### Luồng hoạt động

```
1. Chủ quỹ cấu hình TK ngân hàng
   → POST /organizations (kèm bankInfo)
   → hoặc PATCH /organizations/:id với { bankInfo: {...} }
   → hoặc PATCH /users/me với { bankInfo: {...} }
   → hoặc kèm bankInfo khi POST /campaigns (TK riêng của campaign)

2. Donor tạo donation
   → POST /donations { campaignId, amount }
   ← Nhận { transferCode: "DONAB12CD", ... }

3. Donor lấy QR để chuyển khoản
   → GET /donations/:id/payment-qr
   ← Nhận QR image, số TK, số tiền, nội dung CK

4. Donor quét QR → chuyển khoản
   (nội dung CK đã được điền sẵn = transferCode)

5. Admin xác nhận
   → POST /donations/confirm/DONAB12CD { adminNote: "GD 14:32 ref VCB123" }
   ← Hệ thống cộng tiền vào campaign, đánh dấu CONFIRMED
```

### Nguồn bank info — thứ tự ưu tiên

```
Campaign.bankInfo  (TK riêng của campaign)
      ↓ nếu không có
Organization.bankInfo  (TK chung của tổ chức)
      ↓ nếu không có
User.bankInfo  (TK cá nhân người tạo campaign)
      ↓ nếu không có
BadRequestException: "Chưa cấu hình tài khoản ngân hàng"
```

### Cấu trúc BankInfo

```json
{
  "bankInfo": {
    "bankName": "MB Bank",
    "bankBin": "970422",
    "accountNumber": "0123456789",
    "accountName": "QUY TU THIEN ABC"
  }
}
```

### Mã BIN một số ngân hàng phổ biến

| Ngân hàng | BIN |
|-----------|-----|
| Vietcombank | 970436 |
| MB Bank | 970422 |
| Techcombank | 970407 |
| VPBank | 970432 |
| Vietinbank | 970415 |
| BIDV | 970418 |
| Agribank | 970405 |
| ACB | 970416 |
| TPBank | 970423 |

> Xem danh sách đầy đủ: `GET https://api.vietqr.io/v2/banks`

### Sử dụng QR trên Frontend

```html
<!-- Cách 1: Nhúng ảnh QR trực tiếp (PNG stream) -->
<img src="http://localhost:8080/donations/{id}/payment-qr/image" />

<!-- Cách 2: Dùng data URL từ JSON response -->
<script>
  fetch('/donations/{id}/payment-qr')
    .then(r => r.json())
    .then(data => {
      document.getElementById('qr').src = data.qrCodeDataUrl;
      document.getElementById('transfer-code').textContent = data.transferCode;
      document.getElementById('amount').textContent = data.amount.toLocaleString('vi-VN') + ' VND';
    });
</script>
```

---

## Phân quyền

| Role | Quyền hạn |
|------|-----------|
| **USER** | Đăng ký, xem dữ liệu, quyên góp, tạo tổ chức/campaign (sau khi verified) |
| **AUDITOR** | Tất cả quyền USER + duyệt/từ chối tổ chức, chiến dịch |
| **ADMIN** | Tất cả quyền + quản lý users, xem dashboard, xác nhận donations |

### Luồng xác minh

```
User đăng ký (có thể kèm bankInfo)
    → Admin nâng role → VERIFIED
    → User tạo Organization (kèm bankInfo của tổ chức)
    → Upload legal documents
    → Gửi request verification
    → Auditor duyệt → VERIFIED (ghi on-chain)
    → Tạo Campaign (bankInfo tùy chọn, nếu để trống dùng bankInfo của Org)
    → Auditor duyệt Campaign → VERIFIED (ghi on-chain)
    → Donors quyên góp → nhận QR VietQR → CK ngân hàng
    → Admin xác nhận → tiền được ghi vào campaign
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
│   ├── common/
│   │   ├── dto/
│   │   │   └── bank-info.dto.ts    # BankInfoDto dùng chung (VietQR)
│   │   └── enums/              # Shared enums (Role, VerificationStatus)
│   └── modules/
│       ├── auth/               # JWT authentication & guards
│       ├── users/              # User profile + bankInfo management
│       ├── organizations/      # Organization CRUD & verification + bankInfo
│       ├── campaigns/          # Campaign CRUD & verification + bankInfo
│       ├── donations/          # Donation + QR VietQR generation & xác nhận
│       │   ├── donations.service.ts       # Logic donation + đối soát
│       │   ├── donations-qr.service.ts    # EMV QR / VietQR generation
│       │   └── schemas/donation.schema.ts # Schema + PaymentStatus enum
│       ├── verification/       # Verification request workflow
│       ├── admin/              # Admin dashboard
│       └── blockchain/         # Hyperledger Fabric integration
│           ├── blockchain.service.ts  # Gateway, transactions
│           └── fabric/
│               └── wallet-setup.js   # Enroll admin + appUser
├── .env
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
