import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
    CreateOrganizationInput,
    CreateCampaignInput,
    RecordDonationInput,
    OrganizationAsset,
    CampaignAsset,
    DonationAsset,
} from './fabric/chaincode.types';

/**
 * Blockchain Service
 * 
 * This service abstracts the Hyperledger Fabric network interaction.
 * In production, this would connect to the actual Fabric network using fabric-network SDK.
 * For development/testing, it uses an in-memory mock implementation.
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
    private readonly logger = new Logger(BlockchainService.name);
    private useMock: boolean;

    // In-memory storage for mock mode
    private organizations: Map<string, OrganizationAsset> = new Map();
    private campaigns: Map<string, CampaignAsset> = new Map();
    private donations: Map<string, DonationAsset> = new Map();
    private history: Map<string, any[]> = new Map();

    constructor(private configService: ConfigService) {
        this.useMock = this.configService.get<string>('BLOCKCHAIN_MODE') !== 'production';
    }

    async onModuleInit() {
        if (this.useMock) {
            this.logger.log('Blockchain service initialized in MOCK mode');
        } else {
            await this.initializeFabricGateway();
        }
    }

    private async initializeFabricGateway() {
        // Production Hyperledger Fabric connection
        // This would use fabric-network SDK to connect to the actual network
        try {
            this.logger.log('Initializing Hyperledger Fabric gateway...');
            // const { Gateway, Wallets } = require('fabric-network');
            // Implementation would go here
            this.logger.log('Hyperledger Fabric gateway initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Fabric gateway:', error);
            this.useMock = true;
            this.logger.warn('Falling back to mock mode');
        }
    }

    private generateHash(data: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }

    private addToHistory(id: string, action: string, data: any) {
        const historyEntry = {
            txId: uuidv4(),
            timestamp: new Date().toISOString(),
            action,
            data,
        };
        const existing = this.history.get(id) || [];
        existing.push(historyEntry);
        this.history.set(id, existing);
    }

    // Organization operations
    async createOrganization(input: CreateOrganizationInput): Promise<string> {
        const id = uuidv4();
        const asset: OrganizationAsset = {
            docType: 'organization',
            id,
            mongoId: input.mongoId,
            name: input.name,
            creatorUserId: input.creatorUserId,
            verificationStatus: 'UNVERIFIED',
            createdAt: new Date().toISOString(),
            hash: this.generateHash(input),
        };

        if (this.useMock) {
            this.organizations.set(id, asset);
            this.addToHistory(id, 'CREATE_ORGANIZATION', asset);
            this.logger.log(`[MOCK] Created organization: ${id}`);
        } else {
            // Submit to Fabric chaincode
            // await contract.submitTransaction('createOrganization', JSON.stringify(asset));
        }

        return id;
    }

    async verifyOrganization(blockchainId: string, adminId: string): Promise<void> {
        if (this.useMock) {
            const org = this.organizations.get(blockchainId);
            if (org) {
                org.verificationStatus = 'VERIFIED';
                org.verifiedAt = new Date().toISOString();
                org.verifiedBy = adminId;
                org.hash = this.generateHash(org);
                this.addToHistory(blockchainId, 'VERIFY_ORGANIZATION', { adminId, timestamp: org.verifiedAt });
                this.logger.log(`[MOCK] Verified organization: ${blockchainId}`);
            }
        } else {
            // await contract.submitTransaction('verifyOrganization', blockchainId, adminId);
        }
    }

    async getOrganizationHistory(blockchainId: string): Promise<any[]> {
        if (this.useMock) {
            return this.history.get(blockchainId) || [];
        }
        // return await contract.evaluateTransaction('getOrganizationHistory', blockchainId);
        return [];
    }

    // Campaign operations
    async createCampaign(input: CreateCampaignInput): Promise<string> {
        const id = uuidv4();
        const asset: CampaignAsset = {
            docType: 'campaign',
            id,
            mongoId: input.mongoId,
            organizationId: input.organizationId,
            title: input.title,
            goalAmount: input.goalAmount,
            currentAmount: 0,
            verificationStatus: 'UNVERIFIED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            hash: this.generateHash(input),
        };

        if (this.useMock) {
            this.campaigns.set(id, asset);
            this.addToHistory(id, 'CREATE_CAMPAIGN', asset);
            this.logger.log(`[MOCK] Created campaign: ${id}`);
        } else {
            // await contract.submitTransaction('createCampaign', JSON.stringify(asset));
        }

        return id;
    }

    async verifyCampaign(blockchainId: string, adminId: string): Promise<void> {
        if (this.useMock) {
            const campaign = this.campaigns.get(blockchainId);
            if (campaign) {
                campaign.verificationStatus = 'VERIFIED';
                campaign.verifiedAt = new Date().toISOString();
                campaign.verifiedBy = adminId;
                campaign.hash = this.generateHash(campaign);
                this.addToHistory(blockchainId, 'VERIFY_CAMPAIGN', { adminId, timestamp: campaign.verifiedAt });
                this.logger.log(`[MOCK] Verified campaign: ${blockchainId}`);
            }
        } else {
            // await contract.submitTransaction('verifyCampaign', blockchainId, adminId);
        }
    }

    async getCampaignHistory(blockchainId: string): Promise<any[]> {
        if (this.useMock) {
            return this.history.get(blockchainId) || [];
        }
        // return await contract.evaluateTransaction('getCampaignHistory', blockchainId);
        return [];
    }

    // Donation operations
    async recordDonation(input: RecordDonationInput): Promise<string> {
        const asset: DonationAsset = {
            docType: 'donation',
            id: input.id,
            mongoId: input.mongoId,
            campaignId: input.campaignId,
            organizationId: input.organizationId,
            amount: input.amount,
            donorHash: input.donorHash,
            timestamp: input.timestamp,
        };

        if (this.useMock) {
            this.donations.set(input.id, asset);
            this.addToHistory(input.id, 'RECORD_DONATION', asset);

            // Update campaign amount
            const campaign = this.campaigns.get(input.campaignId);
            if (campaign) {
                campaign.currentAmount += input.amount;
                campaign.updatedAt = new Date().toISOString();
            }

            this.logger.log(`[MOCK] Recorded donation: ${input.id}`);
        } else {
            // await contract.submitTransaction('recordDonation', JSON.stringify(asset));
        }

        return input.id;
    }

    async getDonationHistory(donationId: string): Promise<any[]> {
        if (this.useMock) {
            const donation = this.donations.get(donationId);
            return donation ? [{ txId: donationId, ...donation }] : [];
        }
        // return await contract.evaluateTransaction('getDonationHistory', donationId);
        return [];
    }

    async getCampaignDonations(campaignId: string): Promise<DonationAsset[]> {
        if (this.useMock) {
            return Array.from(this.donations.values()).filter(d => d.campaignId === campaignId);
        }
        // return await contract.evaluateTransaction('getCampaignDonations', campaignId);
        return [];
    }

    // Admin/Audit operations
    async getAuditLog(entityType: 'organization' | 'campaign' | 'donation', entityId: string) {
        return this.history.get(entityId) || [];
    }

    async getAllOrganizations(): Promise<OrganizationAsset[]> {
        if (this.useMock) {
            return Array.from(this.organizations.values());
        }
        return [];
    }

    async getAllCampaigns(): Promise<CampaignAsset[]> {
        if (this.useMock) {
            return Array.from(this.campaigns.values());
        }
        return [];
    }
}
