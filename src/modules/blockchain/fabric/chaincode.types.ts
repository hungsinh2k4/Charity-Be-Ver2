// Chaincode types for Hyperledger Fabric

export interface OrganizationAsset {
  docType: 'organization';
  id: string;
  mongoId: string;
  name: string;
  creatorUserId: string;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED';
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  hash: string;
}

export interface CampaignAsset {
  docType: 'campaign';
  id: string;
  mongoId: string;
  organizationId: string;
  title: string;
  goalAmount: number;
  currentAmount: number;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED';
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  hash: string;
}

export interface DonationAsset {
  docType: 'donation';
  id: string;
  mongoId: string;
  campaignId: string;
  organizationId: string;
  amount: number;
  donorHash: string;
  timestamp: string;
  previousTxId?: string;
}

export interface CreateOrganizationInput {
  mongoId: string;
  name: string;
  creatorUserId: string;
}

export interface CreateCampaignInput {
  mongoId: string;
  organizationId: string;
  title: string;
  goalAmount: number;
}

export interface RecordDonationInput {
  id: string;
  mongoId: string;
  campaignId: string;
  organizationId: string;
  amount: number;
  donorHash: string;
  timestamp: string;
}
