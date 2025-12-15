# Transparent Donation System Backend

A blockchain-enabled donation platform ensuring transparency, auditability, and immutability using NestJS, MongoDB, and Hyperledger Fabric.

## Tech Stack

- **NestJS** - REST API framework
- **MongoDB** - Off-chain data storage
- **Hyperledger Fabric** - On-chain immutable records
- **Swagger/OpenAPI** - API documentation
- **JWT** - Authentication

## Features

- 🔐 **User Authentication** - JWT-based with role-based access control
- 🏢 **Organization Management** - CRUD with blockchain recording
- 📢 **Campaign Management** - Create fundraising campaigns
- 💰 **Anonymous Donations** - No account required, optional email
- ✅ **Verification System** - Multi-level verification workflow
- 📊 **Audit Trail** - Complete blockchain-backed history
- 👮 **Admin Dashboard** - Stats and management tools

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally or connection URI
- (Optional) Hyperledger Fabric network for production

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Charity-Be-ver2

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run start:dev
```

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/charity
JWT_SECRET=your-secret-key
PORT=3000
BLOCKCHAIN_MODE=mock  # Use 'production' for real Fabric network
```

## API Documentation

Once running, access Swagger UI at: `http://localhost:3000/api`

### Main Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/auth/register` | POST | Register user | Public |
| `/auth/login` | POST | Get JWT token | Public |
| `/organizations` | GET/POST | List/Create orgs | Public/JWT |
| `/campaigns` | GET/POST | List/Create campaigns | Public/JWT |
| `/donations` | POST | Make donation | Public |
| `/verification/requests` | GET | List requests | Admin |
| `/admin/dashboard` | GET | Get stats | Admin |

## Roles

| Role | Permissions |
|------|-------------|
| **USER** | Register, create orgs (if verified), create campaigns |
| **ADMIN** | All permissions + verify/reject requests |
| **AUDITOR** | Read-only access to verification and audit data |

## Project Structure

```
src/
├── common/enums/           # Shared enums
├── modules/
│   ├── auth/              # Authentication
│   ├── users/             # User management
│   ├── organizations/     # Organization CRUD
│   ├── campaigns/         # Campaign CRUD
│   ├── donations/         # Donation handling
│   ├── verification/      # Verification workflow
│   ├── admin/             # Admin operations
│   └── blockchain/        # Hyperledger Fabric
├── app.module.ts
└── main.ts
```

## Blockchain Integration

The system uses Hyperledger Fabric for:
- **Immutable donation records**
- **Organization verification proofs**
- **Campaign audit trails**

Set `BLOCKCHAIN_MODE=mock` for development (uses in-memory storage).

## Scripts

```bash
npm run start:dev    # Development with hot reload
npm run build        # Production build
npm run start:prod   # Run production build
npm run test         # Run tests
npm run lint         # Lint code
```

## License

MIT
