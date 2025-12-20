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

### Get Audit Trail
`GET /organizations/:id/audit`
*Get organization blockchain audit trail.*

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

### Get Audit Trail
`GET /campaigns/:id/audit`
*Get campaign blockchain audit trail.*

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

### List Requests
`GET /verification/requests`
*Requires Auth (Admin/Auditor only)*

**Query Parameters**:
- `status`: enum (`PENDING`, `APPROVED`, `REJECTED`)

### Get Request by ID
`GET /verification/requests/:id`
*Requires Auth (Admin/Auditor only)*

### Process Request
`POST /verification/requests/:id/process`
*Requires Auth (Admin only)*

**Body**:
```json
{
  "approved": true,                  // required
  "reviewNotes": "Looks good"        // optional
}
```

### Get Stats
`GET /verification/stats`
*Requires Auth (Admin/Auditor only)*

---

## Admin

**Endpoint**: `/admin`
*All endpoints require Auth (Admin or Auditor role)*

### Get Dashboard Stats
`GET /admin/dashboard`
*(Admin/Auditor)*

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

### Get Organization Audit
`GET /admin/audit/organizations/:id`
*(Admin/Auditor)*

### Get Campaign Audit
`GET /admin/audit/campaigns/:id`
*(Admin/Auditor)*

### Get Blockchain Summary
`GET /admin/blockchain/summary`
*(Admin/Auditor)*

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
