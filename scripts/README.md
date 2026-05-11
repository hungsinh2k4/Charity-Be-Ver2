# Database Seeding Guide

## 📋 Overview

This guide explains how to populate your MongoDB database with mock data for frontend development and testing.

## 🚀 Quick Start

### Run the Seeding Script

```bash
npm run seed:db
```

This will:
- ✅ Connect to MongoDB
- 🗑️ Clear existing data in all collections
- 📝 Create comprehensive mock data
- ✅ Display a summary of created records

### Environment Setup

Make sure your `.env` file has the correct MongoDB connection string:

```env
MONGODB_URI=mongodb://localhost:27017/charity-db
```

## 📊 What Gets Created

### Users
- **1 Admin**: `admin@charity.com` (password: `Admin123!`)
- **1 Auditor**: `auditor@charity.com` (password: `Password123!`)
- **1 Moderator**: `moderator@charity.com` (password: `Password123!`)
- **5 Organization Users**: Verified users who manage organizations
- **Regular Users**: Mix of verified, pending, unverified, and rejected status

### Organizations (5 total)
- Helping Hands Foundation
- Green Future Vietnam
- Education For All
- Health Hope Organization
- Children Smiles

Each with realistic:
- Descriptions and contact information
- Blockchain IDs (some without for testing)
- Links to user accounts

### Campaigns (10 total)
Categories include:
- 💧 Healthcare (Clean Water, Mobile Medical Clinic)
- 🌳 Environment (Reforestation, Ocean Cleanup)
- 📚 Education (School Supplies, Computer Labs, Vocational Training)
- 👶 Children (Orphanage Renovation)
- 🆘 Emergency (Disaster Relief)

Status distribution:
- 6 VERIFIED campaigns
- 2 PENDING campaigns
- 1 REJECTED campaign
- 1 INACTIVE campaign

### Donations (25 total)
- Amounts ranging from $600 to $42,000
- Mix of anonymous and named donors
- Various payment methods (Credit Card, Bank Transfer, PayPal, Cryptocurrency, etc.)
- Realistic blockchain transaction IDs
- Some with messages and subscription preferences

### Verification Requests
- USER entities: pending and approved examples
- ORGANIZATION entities: pending and approved examples
- CAMPAIGN entities: pending, approved, and rejected examples
- With realistic documents, notes, and review comments

## 🔐 Test Accounts

You can log in with these accounts for testing:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@charity.com | Admin123! |
| Moderator | moderator@charity.com | Password123! |
| Auditor | auditor@charity.com | Password123! |
| Organization | org1@helpinghands.org | Password123! |
| Organization | org2@greenfuture.org | Password123! |
| Organization | org3@educationforall.org | Password123! |
| Verified User | donor1@gmail.com | Password123! |
| Pending User | pending@example.com | Password123! |
| Unverified User | user.unverified@charity.com | Password123! |
| Rejected User | user.rejected@charity.com | Password123! |

## 📁 Database Collections

After seeding, you'll have data in:
- `users` - User accounts with auth and verification
- `organizations` - Charity organizations
- `campaigns` - Fundraising campaigns
- `donations` - Donation transactions
- `verificationrequests` - Verification workflow records

## 🔄 Re-seeding

To clear and re-seed the database:

```bash
npm run seed:clear
```

⚠️ **Warning**: This will delete all existing data!

## 🎯 Use Cases

### Frontend Testing
- Test user authentication with different roles
- Display campaigns with various statuses
- Show donation history and statistics
- Test verification workflows
- Display organizational profiles

### API Testing
- All entities have proper ObjectId references
- Blockchain IDs are generated for most records
- Timestamps are set realistically
- Relationships are properly linked

## 🛠️ Technical Details

### Script Location
`scripts/seed.ts`

### Dependencies Used
- `mongodb` - Direct MongoDB connection
- `bcrypt` - Password hashing
- `dotenv` - Environment variables
- `uuid` - Generating unique IDs

### Data Relationships
```
Users
  └── Organizations (userId, creatorId)
       └── Campaigns (organizationId, creatorId)
            └── Donations (campaignId, organizationId)

VerificationRequests → Users or Campaigns (entityType, entityId)
```

## 📞 Support

If you encounter any issues:
1. Verify MongoDB is running
2. Check `.env` configuration
3. Ensure all dependencies are installed: `npm install`
4. Check console output for specific error messages

## 💡 Tips

- The script uses Vietnamese names and locations for realistic testing
- All campaigns have realistic descriptions and Vietnamese context
- Donation amounts vary to test different UI scenarios
- Mix of blockchain IDs
 allows testing of both synced and unsynced records
- Verification statuses cover all workflow states
