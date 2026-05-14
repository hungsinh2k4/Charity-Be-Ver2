# API Documentation

**Base URL**: `http://localhost:3000` (default)
**Global Prefix**: Not set (root)

## Shortcuts

- [Auth](#auth)
- [Users](#users)
- [Organizations](#organizations)
- [Campaigns](#campaigns)
- [Donations](#donations)
- [Verification](#verification)
- [Admin](#admin)
- [Enums](#enums)

---

## Auth

**Endpoint**: `/auth`

### Register
`POST /auth/register`
*Register a new user account.*

**Body**:
```json
{
  "email": "user@example.com",     // required, email
  "password": "password123",       // required, min 6 chars
  "name": "John Doe",              // required
  "phone": "0123456789",           // optional
  "address": "Hà Nội"              // optional
}
```

### Login
`POST /auth/login`
*Login with email and password.*

**Body**:
```json
{
  "email": "user@example.com",     // required, email
  "password": "password123"        // required
}
```
**Response**:
Returns JWT token.

---

## Users

**Endpoint**: `/users`

### Get Profile
`GET /users/me`
*Requires Auth (Bearer Token)*
*Get current user profile.*

### Update Profile
`PATCH /users/me`
*Requires Auth (Bearer Token)*
*Update current user profile.*

**Body**:
```json
{
  "name": "New Name",              // optional
  "password": "newpassword123"     // optional, min 6 chars
}
```

---

## Organizations

**Endpoint**: `/organizations`

### Create Organization
`POST /organizations`
*Requires Auth (Bearer Token) & Verified User Status*

**Body**:
```json
{
  "userId": "676a...",             // required, ObjectId
  "name": "Org Name",              // required
  "description": "Mission...",     // optional
  "website": "https://...",        // optional
  "contactEmail": "contact@...",   // optional
  "contactPhone": "090...",        // optional
  "address": "123 Street..."       // optional
}
```

### List Organizations
`GET /organizations`
*List all organizations.*

### Get My Organizations
`GET /organizations/my`
*Requires Auth (Bearer Token)*
*Get organizations created by current user.*

### Get Organization by ID
`GET /organizations/:id`
*Get organization details.*

### Update Organization
`PATCH /organizations/:id`
*Requires Auth (Bearer Token) - Creator only*

**Body**:
```json
{
  "name": "Updated Name",          // optional
  "description": "Updated...",     // optional
  "website": "https://...",        // optional
  "contactEmail": "new@...",       // optional
  "contactPhone": "091...",        // optional
  "address": "New Addr..."         // optional
}
```

### Delete Organization
`DELETE /organizations/:id`
*Requires Auth (Bearer Token) - Creator only*
*Soft delete organization.*

---

## Campaigns

**Endpoint**: `/campaigns`

### Create Campaign
`POST /campaigns`
*Requires Auth (Bearer Token) - Organization Creator only*

**Body**:
```json
{
  "title": "Campaign Title",       // required
  "description": "Details...",     // required
  "summary": "Short summary",      // optional
  "coverImage": "https://...",     // optional
  "goalAmount": 10000,             // required, number > 0
  "currency": "USD",               // optional, default USD
  "organizationId": "676a...",     // required, ObjectId
  "startDate": "2025-01-01...",    // optional, ISO8601
  "endDate": "2025-12-31...",      // optional, ISO8601
  "category": "Environment",       // optional
  "tags": ["tag1", "tags2"]        // optional, array of strings
}
```

### List Campaigns
`GET /campaigns`
*List all campaigns with optional filters.*

**Query Parameters**:
- `organizationId`: string (optional)
- `verificationStatus`: enum (`PENDING`, `VERIFIED`, `REJECTED`) (optional)
- `isActive`: boolean (optional)

### Get Campaign by ID
`GET /campaigns/:id`
*Get campaign details.*

### Update Campaign
`PATCH /campaigns/:id`
*Requires Auth (Bearer Token) - Creator only*

**Body**:
```json
{
  "title": "New Title",            // optional
  "description": "New Desc...",    // optional
  "summary": "New Summary",        // optional
  "coverImage": "https://...",     // optional
  "goalAmount": 15000,             // optional
  "startDate": "...",              // optional
  "endDate": "...",                // optional
  "isActive": true,                // optional, boolean
  "category": "New Cat",           // optional
  "tags": ["new", "tags"]          // optional
}
```

### Delete Campaign
`DELETE /campaigns/:id`
*Requires Auth (Bearer Token) - Creator only*
*Soft delete campaign.*

---

## Donations

**Endpoint**: `/donations`

### Create Donation
`POST /donations`
*Public access*

**Body**:
```json
{
  "campaignId": "676a...",          // required
  "amount": 100,                    // required, number > 0
  "currency": "USD",                // optional, default USD
  "donorEmail": "me@mail.com",      // optional
  "donorName": "Anonymous",         // optional
  "isAnonymous": true,              // optional, default true
  "message": "Good luck!",          // optional
  "paymentMethod": "card",          // optional
  "paymentReference": "txn_123",    // optional
  "subscribeToUpdates": false       // optional
}
```

### Get Donation by ID
`GET /donations/:id`
*Get donation details.*

### Verify Donation
`GET /donations/:id/verify`
*Get blockchain verification proof.*

### Get By Campaign
`GET /donations/campaign/:campaignId`
*Get all donations for a campaign.*

### Subscribe to Updates
`POST /donations/subscribe`

**Body**:
```json
{
  "campaignId": "string",
  "email": "string"
}
```

### Get Stats
`GET /donations?campaignId=...`
*Get donation statistics.*

---

## Verification

**Endpoint**: `/verification`

### Create Verification Request
`POST /verification/request`
*Requires Auth (Bearer Token)*

**Body**:
```json
{
  "entityType": "USER" | "CAMPAIGN", // required
  "entityId": "string",              // required
  "documents": ["url1"],             // optional
  "notes": "string"                  // optional
}
```

---

## Moderator

**Endpoint**: `/moderator`
*All endpoints require JWT auth and `MODERATOR` role.*

### List Verification Requests
`GET /moderator/verification/requests`

**Query Parameters**:
- `status`: enum (`PENDING`, `APPROVED`, `REJECTED`)

### Get Verification Request by ID
`GET /moderator/verification/requests/:id`

### Process Verification Request
`POST /moderator/verification/requests/:id/process`

**Body**:
```json
{
  "approved": true,
  "reviewNotes": "Looks good"
}
```

### Get Verification Stats
`GET /moderator/verification/stats`

### Pending User Verifications
`GET /moderator/users/pending-verifications`

### User Verification Details
`GET /moderator/users/:id/verification-details`

### Pending Organization Verifications
`GET /moderator/organizations/pending-verifications`

### Pending Campaign Verifications
`GET /moderator/campaigns/pending-verifications`

---

## Auditor

**Endpoint**: `/auditor`
*All endpoints require JWT auth and `AUDITOR` or `ADMIN` role.*

### Get Campaign Audit
`GET /auditor/audit/campaigns/:id`

### Get Donation Audit
`GET /auditor/audit/donations/:id`

Auditor only traces money-related records: fundraising campaigns and confirmed donations. Audit endpoints return the MongoDB record, stored blockchain ID, blockchain connection status, and audit history queried through the Blockchain Module.

---

## Admin

**Endpoint**: `/admin`
*All endpoints require JWT auth. Individual role requirements are listed below.*

### Get Dashboard Stats
`GET /admin/dashboard`
*(Admin only)*

### Get All Users
`GET /admin/users`
*(Admin only)*

### Update User Role
`PATCH /admin/users/:id/role`
*(Admin only)*

**Body**:
```json
{
  "role": "ADMIN" // "USER", "ADMIN", "AUDITOR"
}
```

---

## Enums

### Role
- `USER`
- `ADMIN`
- `AUDITOR`

### EntityType
- `USER`
- `CAMPAIGN`

### RequestStatus / VerificationStatus
- `PENDING`
- `APPROVED` (or `VERIFIED`)
- `REJECTED`
