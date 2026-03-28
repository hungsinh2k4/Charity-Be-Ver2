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

> **Nguyên tắc:** Donation chỉ được lưu vào lịch sử SAU KHI ngân hàng xác nhận tiền đã về.  
> Trước đó, mọi thứ nằm trong `PendingDonation` (bảng tạm) — không ảnh hưởng số liệu campaign.

```
Donor                      Backend                    Sepay / Casso
  │                            │                            │
  │  POST /donations           │                            │
  │  { campaignId, amount }    │                            │
  │ ──────────────────────────▶│                            │
  │                            │─ Tạo PendingDonation       │
  │                            │  (bảng tạm, chưa lưu GD)  │
  │  { pendingId,              │                            │
  │    transferCode: "DONAB12",│                            │
  │    expiresAt }             │                            │
  │ ◀──────────────────────────│                            │
  │                            │                            │
  │  GET /donations/:pendingId/payment-qr                   │
  │ ──────────────────────────▶│                            │
  │  ← QR image, bankInfo,     │                            │
  │    transferCode, expiresAt │                            │
  │                            │                            │
  │  [Quét QR → CK ngân hàng] │                            │
  │  nội dung: "DONAB12CD"     │──────────────────────────▶│
  │                            │                    [GD thành công]
  │                            │                            │
  │  [Poll GET /:id/status]    │◀── POST /webhook/sepay ───│
  │ ──────────────────────────▶│    (webhook tự động ~5s)  │
  │                            │                            │
  │                            │─ Match transferCode + amount
  │                            │─ Tạo Donation ✅ (MongoDB)
  │                            │─ Cập nhật campaign.currentAmount
  │                            │─ Ghi Blockchain (Fabric)
  │                            │─ Xóa PendingDonation
  │                            │                            │
  │  { status: "payment_confirmed",                         │
  │    donationId: "..." }     │                            │
  │ ◀──────────────────────────│                            │
```

### Cơ chế xác nhận — 3 tầng bảo vệ

```
① WEBHOOK (Sepay / Casso)    → tự động, ~1–5 giây   │ 99% trường hợp
② CRON POLLING (mỗi 2 phút) → tự động, fallback     │ ~0.9% (webhook miss)
③ ADMIN CONFIRM (thủ công)  → fallback cuối cùng    │ ~0.1% (sai nội dung CK)
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
ss
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
| POST | `/donations` | **[B1]** Khởi tạo donation → nhận `pendingId` + `transferCode` | Optional JWT |
| GET | `/donations/:pendingId/payment-qr` | **[B2]** Lấy QR VietQR để chuyển khoản | Public |
| GET | `/donations/:pendingId/payment-qr/image` | Ảnh QR PNG stream | Public |
| GET | `/donations/:pendingId/status` | **[B3]** Frontend poll trạng thái (5–10s/lần) | Public |
| POST | `/donations/webhook/sepay` | 🔔 **Webhook** tự động từ Sepay | Internal |
| POST | `/donations/webhook/casso` | 🔔 **Webhook** tự động từ Casso | Internal |
| POST | `/donations/confirm/:transferCode` | 👮 Admin xác nhận thủ công (fallback) | JWT (Admin) |
| GET | `/donations/lookup/:transferCode` | Tra cứu theo mã CK (pending hoặc confirmed) | Public |
| GET | `/donations/my` | Danh sách donation đã CONFIRMED của tôi | JWT |
| GET | `/donations/campaign/:id` | Donations đã CONFIRMED của campaign | Public |
| GET | `/donations/:id/verify` | **Xác minh trên blockchain** | Public |

### Admin
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/admin/dashboard` | Thống kê tổng quan | Admin |
| GET | `/admin/users` | Quản lý users | Admin |
| GET | `/admin/audit/organizations/:id` | Audit org | Admin |
| GET | `/admin/audit/campaigns/:id` | Audit campaign | Admin |

---

## 🔳 Tích hợp QR VietQR — Luồng Confirm-First

> **Thiết kế cốt lõi:** Donation **chỉ được lưu vào MongoDB và blockchain** sau khi ngân hàng xác nhận tiền đã về.  
> Mọi thông tin tạm thời nằm trong `PendingDonation` — bảng tạm tự động xóa sau 30 phút nếu không có GD khớp.

### Chuẩn kỹ thuật QR
QR Code được sinh theo **chuẩn EMV QR / VietQR (NAPAS 247)**, tương thích với tất cả app ngân hàng Việt Nam (MB Bank, Vietcombank, BIDV, Techcombank, v.v.) — không cần thư viện phía client.

### Luồng hoạt động đầy đủ

```
Bước 1 — Donor khởi tạo
   → POST /donations { campaignId, amount, donorName? }
   ← { pendingId, transferCode: "DONAB12CD",
       expiresAt: "2026-03-18T16:30:00Z",
       message: "Vui lòng CK với nội dung: DONAB12CD" }

Bước 2 — Hiển thị QR để quét
   → GET /donations/:pendingId/payment-qr
   ← { qrCodeDataUrl, vietqrImageUrl, vietqrDeeplink,
       transferCode, amount, bankInfo, expiresAt }

Bước 3 — Donor quét QR → CK ngân hàng
   Nội dung CK được điền sẵn = transferCode
   (quan trọng: không được sửa nội dung CK)

Bước 4 — Hệ thống tự động xác nhận (không cần thao tác thủ công)
   [Tầng 1 - Webhook]  Sepay/Casso gọi /donations/webhook/sepay
                        → hệ thống nhận trong ~1–5 giây
   [Tầng 2 - Polling]  Cron job mỗi 2 phút quét PendingDonation
                        → backup phòng webhook miss
   Khi khớp transferCode + amount:
   → Tạo Donation record (MongoDB) với status = CONFIRMED
   → Cộng tiền vào campaign.currentAmount
   → Ghi lên Hyperledger Fabric blockchain
   → Xóa PendingDonation

Bước 5 — Frontend nhận kết quả
   → Poll GET /donations/:pendingId/status mỗi 5–10 giây
   ← { status: "payment_confirmed", donationId: "...", paidAt: "..." }
   → Hiển thị trang "Cảm ơn bạn đã quyên góp! ✅"

[Fallback] Nếu donor ghi sai nội dung CK hoặc webhook lỗi:
   Admin: POST /donations/confirm/:transferCode { adminNote: "..." }
```

### Trạng thái PendingDonation

| Status | Ý nghĩa |
|--------|---------|
| `waiting_payment` | Đang chờ donor quét QR và chuyển khoản |
| `checking` | Cron job đang poll ngân hàng kiểm tra |
| `payment_confirmed` | ✅ Tiền về rồi — Donation đã tạo |
| `expired` | ❌ Quá 30 phút không có GD khớp |

> **Donation** (lịch sử thật) chỉ có 1 trạng thái duy nhất: **`confirmed`**  
> Vì nó chỉ được tạo khi đã xác nhận xong.

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

### Tích hợp Frontend (code mẫu)

```js
// Bước 1: Khởi tạo donation
const { pendingId, transferCode, expiresAt } = await fetch('/donations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ campaignId, amount, donorName }),
}).then(r => r.json());

// Bước 2: Hiển thị QR
// <img src="/donations/{pendingId}/payment-qr/image" />
// <p>Nội dung CK: <strong>{transferCode}</strong></p>

// Bước 3: Poll trạng thái mỗi 5 giây
const timer = setInterval(async () => {
  const { status, donationId } = await fetch(`/donations/${pendingId}/status`).then(r => r.json());

  if (status === 'payment_confirmed') {
    clearInterval(timer);
    window.location.href = `/donation/success?id=${donationId}`; // ✅
  } else if (status === 'expired') {
    clearInterval(timer);
    alert('Phiên thanh toán đã hết hạn. Vui lòng thử lại.'); // ❌
  }
}, 5000);
```

### Cấu hình Payment Provider (.env)

```env
# Chọn provider: sepay | casso | mock
PAYMENT_PROVIDER=mock

# Sepay (https://sepay.vn) — hỗ trợ 40+ ngân hàng VN, miễn phí gói cơ bản
SEPAY_API_KEY=your_key_here
# Webhook URL cần cấu hình trong Sepay Dashboard:
#   https://your-api.com/donations/webhook/sepay

# Casso (https://casso.vn)
CASSO_API_KEY=your_key_here
# Webhook URL:
#   https://your-api.com/donations/webhook/casso

# Dev/test: PAYMENT_PROVIDER=mock (luôn xác nhận thành công)
# MOCK_PAYMENT_SHOULD_FAIL=false
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
    → Sepay/Casso webhook → Hệ thống tự động xác nhận → tiền được ghi vào campaign + blockchain
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
│       │   ├── donations.service.ts           # Query Donation đã CONFIRMED
│       │   ├── pending-donations.service.ts   # Core luồng: initiate → QR → confirm → tạo Donation
│       │   ├── vietqr-payment.service.ts      # Tích hợp Sepay / Casso API + parse webhook
│       │   ├── donations-qr.service.ts        # EMV QR / VietQR generation
│       │   ├── donations.controller.ts        # REST API + webhook endpoints
│       │   └── schemas/
│       │       ├── donation.schema.ts         # Schema Donation (chỉ lưu khi CONFIRMED)
│       │       └── pending-donation.schema.ts # Schema PendingDonation (bảng tạm, TTL 30phút)
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
