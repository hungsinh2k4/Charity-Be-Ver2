# Transparent Donation System Backend

Backend cho hệ thống quyên góp minh bạch, xây bằng **NestJS**, **MongoDB** và **Hyperledger Fabric**. Donation chỉ được ghi nhận sau khi hệ thống xác nhận giao dịch chuyển khoản, sau đó lưu MongoDB và ghi audit lên blockchain.

## Tech Stack

| Layer | Technology |
| --- | --- |
| API | NestJS + TypeScript |
| Database | MongoDB + Mongoose |
| Blockchain | Hyperledger Fabric |
| Auth | JWT + bcrypt |
| Payment QR | VietQR / EMV QR |
| API Docs | Swagger / OpenAPI |

## Tính Năng Chính

- Xác thực JWT, phân quyền theo `USER`, `MODERATOR`, `AUDITOR`, `ADMIN`.
- Guest có thể xem dữ liệu public và khởi tạo donation nếu hệ thống cho phép.
- User đã verified có thể tạo organization/campaign.
- Moderator duyệt user, organization và campaign.
- Auditor xem audit trail, verification history và dữ liệu truy vết.
- Admin quản trị hệ thống, user role, dashboard và xử lý ngoại lệ.
- Donation theo luồng pending -> QR -> webhook/polling -> confirmed.
- Swagger JSON có thể cập nhật thủ công bằng script riêng.

## Role Và Phân Quyền

| Role | Mục đích | Quyền chính |
| --- | --- | --- |
| Guest | Chưa đăng nhập | Xem campaign/organization/blog public, tạo donation public |
| USER | Tài khoản thường | Cập nhật profile, request verification, xem donation cá nhân, tạo org/campaign khi đã verified |
| MODERATOR | Kiểm duyệt | Xem pending verification, approve/reject user/org/campaign |
| AUDITOR | Kiểm toán | Xem verification request, audit trail, blockchain summary, không duyệt |
| ADMIN | Quản trị hệ thống | Dashboard, quản lý user role, xác nhận donation thủ công, audit overview |

### Lưu ý cho FE

- Không hiện nút approve/reject cho `AUDITOR`.
- Nút approve/reject chỉ dành cho `MODERATOR`.
- `ADMIN` không phải role duyệt nội dung chính, chỉ quản trị và xử lý ngoại lệ.
- Khi tạo organization/campaign cần check `verificationStatus === 'VERIFIED'`.

## Luồng Xác Minh

```text
User đăng ký
  -> gửi yêu cầu xác minh danh tính
  -> MODERATOR duyệt USER
  -> user VERIFIED có thể tạo organization/campaign

Organization tạo bởi user verified
  -> upload legal documents
  -> gửi request verification
  -> MODERATOR duyệt ORGANIZATION
  -> nếu VERIFIED thì ghi trạng thái lên blockchain

Campaign tạo bởi user/org hợp lệ
  -> gửi request verification
  -> MODERATOR duyệt CAMPAIGN
  -> nếu VERIFIED thì ghi trạng thái lên blockchain
```

## Luồng Donation + QR

```text
Guest/User
  -> POST /donations
  -> Backend tạo PendingDonation + transferCode
  -> FE lấy QR qua /donations/:pendingId/payment-qr
  -> Donor chuyển khoản với nội dung transferCode
  -> Webhook Sepay/Casso hoặc polling xác nhận giao dịch
  -> Backend tạo Donation thật
  -> Cộng tiền vào campaign.currentAmount
  -> Ghi blockchain
```

Fallback thủ công:

```text
ADMIN -> POST /donations/confirm/:transferCode
```

## Cài Đặt Local

```bash
npm install
cp .env.example .env
npm run seed:db
npm run start:dev
```

Swagger UI:

```text
http://localhost:8080/api
```

Health check:

```text
http://localhost:8080/health
```

## Local Fabric

File local connection profile:

```text
fabric/connection-profile-local.json
```

`.env` local nên dùng:

```env
BLOCKCHAIN_MODE=production
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=charity-chaincode
FABRIC_WALLET_PATH=./wallet
FABRIC_CONNECTION_PROFILE=./fabric/connection-profile-local.json
FABRIC_USER_ID=appUser
FABRIC_MSP_ID=Org1MSP
FABRIC_CA_NAME=ca.org1.example.com
FABRIC_ADMIN_USER=admin
FABRIC_ADMIN_PASS=adminpw
FABRIC_AS_LOCALHOST=true
```

`connection-profile-local.json` đang trỏ:

```text
peer0.org1.example.com -> grpcs://localhost:7051
orderer.example.com   -> grpcs://localhost:7050
ca.org1.example.com   -> https://localhost:7054
```

Nếu restart/recreate Fabric network, TLS cert có thể đổi. Khi gặp lỗi `DiscoveryService has failed to return results`, cần sync lại TLS cert trong `fabric/connection-profile-local.json` từ container Fabric hiện tại.

## Deploy / Docker

Các môi trường dùng profile riêng:

| Môi trường | Connection profile |
| --- | --- |
| Local Windows/Nest | `./fabric/connection-profile-local.json` |
| Docker Compose | `/app/fabric/connection-docker.json` |
| Cloud Run/GCP | `/app/fabric/connection-gcp.json` |

Docker Compose:

```bash
docker compose down
docker compose build
docker compose up -d
docker compose logs backend -f
```

Production deploy hiện dùng `deploy-prod.ps1` và `env.yaml`, không dùng `.env` local.

## Swagger

`swagger.json` được generate từ decorators hiện tại. Chạy thủ công khi API thay đổi:

```bash
npm run swagger:generate
```

## API Chính

### Auth

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |

### Users

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/users/me` | JWT |
| PATCH | `/users/me` | JWT |
| POST | `/users/request-verification` | JWT |
| GET | `/users/pending-verifications` | MODERATOR |
| GET | `/users/:id/verification-details` | MODERATOR |
| PATCH | `/users/:id/verification-status` | MODERATOR |

### Organizations

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/organizations` | Public |
| POST | `/organizations` | JWT + verified user |
| GET | `/organizations/my` | JWT |
| GET | `/organizations/:id` | Public |
| PATCH | `/organizations/:id` | Owner |
| DELETE | `/organizations/:id` | Owner |
| POST | `/organizations/:id/request-verification` | Owner |
| GET | `/organizations/pending-verifications` | MODERATOR |
| PATCH | `/organizations/:id/verification-status` | MODERATOR |
| GET | `/organizations/:id/audit` | Public |

### Campaigns

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/campaigns` | Public |
| POST | `/campaigns` | JWT + verified user |
| GET | `/campaigns/my` | JWT |
| GET | `/campaigns/:id` | Public |
| PATCH | `/campaigns/:id` | Creator |
| DELETE | `/campaigns/:id` | Creator |
| GET | `/campaigns/pending-verifications` | MODERATOR |
| PATCH | `/campaigns/:id/verification-status` | MODERATOR |
| GET | `/campaigns/:id/audit` | Public |

### Donations

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/donations` | Optional JWT |
| GET | `/donations/:pendingId/payment-qr` | Public |
| GET | `/donations/:pendingId/payment-qr/image` | Public |
| GET | `/donations/:pendingId/status` | Public |
| POST | `/donations/webhook/sepay` | Internal |
| POST | `/donations/webhook/casso` | Internal |
| POST | `/donations/confirm/:transferCode` | ADMIN |
| GET | `/donations/lookup/:transferCode` | Public |
| GET | `/donations/my` | JWT |
| GET | `/donations/campaign/:campaignId` | Public |
| GET | `/donations/:id/verify` | Public |

### Verification

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/verification/request` | JWT |
| GET | `/verification/requests` | MODERATOR / AUDITOR / ADMIN |
| GET | `/verification/requests/:id` | MODERATOR / AUDITOR / ADMIN |
| POST | `/verification/requests/:id/process` | MODERATOR |
| GET | `/verification/stats` | MODERATOR / AUDITOR / ADMIN |

### Admin

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/admin/dashboard` | ADMIN |
| GET | `/admin/users` | ADMIN |
| PATCH | `/admin/users/:id/role` | ADMIN |
| GET | `/admin/audit/organizations/:id` | ADMIN / AUDITOR |
| GET | `/admin/audit/campaigns/:id` | ADMIN / AUDITOR |
| GET | `/admin/blockchain/summary` | ADMIN / AUDITOR |

## Seed Data

```bash
npm run seed:db
```

Lệnh này xóa dữ liệu cũ và tạo mock data mới.

### Tài Khoản Test

| Role / State | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@charity.com` | `Admin123!` |
| MODERATOR | `moderator@charity.com` | `Password123!` |
| AUDITOR | `auditor@charity.com` | `Password123!` |
| USER verified org owner | `org1@helpinghands.org` | `Password123!` |
| USER verified donor | `donor1@gmail.com` | `Password123!` |
| USER pending | `pending@example.com` | `Password123!` |
| USER unverified | `user.unverified@charity.com` | `Password123!` |
| USER rejected | `user.rejected@charity.com` | `Password123!` |

## Scripts

| Script | Mục đích |
| --- | --- |
| `npm run start:dev` | Chạy dev server |
| `npm run build` | Build app |
| `npm run swagger:generate` | Cập nhật `swagger.json` |
| `npm run start:prod` | Chạy production build |
| `npm run seed:db` | Seed mock data |
| `npm run blockchain:setup` | Enroll wallet Fabric |
| `npm run test` | Chạy test |
| `npm run lint` | ESLint |

## Project Structure

```text
chaincode/charity/              Fabric chaincode
fabric/                         Fabric connection profiles
scripts/                        Seed, deploy, Swagger generation
src/common/enums/               Role, status, entity enums
src/modules/auth/               JWT auth, guards, decorators
src/modules/users/              User profile and verification
src/modules/organizations/      Organization CRUD and verification
src/modules/campaigns/          Campaign CRUD and verification
src/modules/donations/          Donation, pending donation, QR, webhook
src/modules/verification/       Generic verification request workflow
src/modules/admin/              Admin and audit endpoints
src/modules/blockchain/         Fabric gateway integration
```

## Notes

- `.env` và `.env.local` không được commit.
- `swagger.json` được commit để FE có thể dùng trực tiếp.
- Admin dashboard có thể hiển thị verification stats như overview, nhưng thao tác duyệt thuộc về Moderator.
- Auditor chỉ đọc/audit, không approve/reject.
