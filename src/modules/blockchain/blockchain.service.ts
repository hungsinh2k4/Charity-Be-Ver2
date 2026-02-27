import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  CreateOrganizationInput,
  CreateCampaignInput,
  RecordDonationInput,
  OrganizationAsset,
  CampaignAsset,
  DonationAsset,
} from './fabric/chaincode.types';

/**
 * BlockchainService
 *
 * Abstraction layer cho Hyperledger Fabric.
 * - BLOCKCHAIN_MODE=production  → kết nối Fabric thật qua fabric-network SDK
 * - BLOCKCHAIN_MODE=mock        → in-memory (dùng cho dev/test)
 */
@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainService.name);
  private useMock: boolean;

  // Fabric objects (production)
  private gateway: any = null;
  private contract: any = null;

  // In-memory storage (mock mode)
  private organizations: Map<string, OrganizationAsset> = new Map();
  private campaigns: Map<string, CampaignAsset> = new Map();
  private donations: Map<string, DonationAsset> = new Map();
  private history: Map<string, any[]> = new Map();

  constructor(private configService: ConfigService) {
    this.useMock =
      this.configService.get<string>('BLOCKCHAIN_MODE') !== 'production';
  }

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  async onModuleInit() {
    if (this.useMock) {
      this.logger.log('⚠️  Blockchain service initialized in MOCK mode');
    } else {
      await this.initializeFabricGateway();
    }
  }

  async onModuleDestroy() {
    await this.disconnectGateway();
  }

  // ─────────────────────────────────────────────
  // FABRIC GATEWAY
  // ─────────────────────────────────────────────

  private async initializeFabricGateway(): Promise<void> {
    try {
      this.logger.log('🔗 Initializing Hyperledger Fabric gateway...');

      // Lazy-require để tránh lỗi khi chạy mock mode mà fabric-network chưa cài
      const { Gateway, Wallets } = require('fabric-network');

      // Đọc config từ env
      const channelName = this.configService.get<string>(
        'FABRIC_CHANNEL_NAME',
        'mychannel',
      );
      const chaincodeName = this.configService.get<string>(
        'FABRIC_CHAINCODE_NAME',
        'charity-chaincode',
      );
      const walletPath = this.configService.get<string>(
        'FABRIC_WALLET_PATH',
        './wallet',
      );
      const connectionProfilePath = this.configService.get<string>(
        'FABRIC_CONNECTION_PROFILE',
        './fabric/connection-profile.json',
      );
      const userId = this.configService.get<string>(
        'FABRIC_USER_ID',
        'appUser',
      );

      // Load connection profile
      const resolvedProfile = path.resolve(connectionProfilePath);
      if (!fs.existsSync(resolvedProfile)) {
        throw new Error(
          `Connection profile không tồn tại: ${resolvedProfile}\n` +
          `Hãy cập nhật fabric/connection-profile.json với thông tin mạng Fabric của bạn.\n` +
          `Sau đó chạy: npx ts-node src/modules/blockchain/fabric/wallet-helper.ts`,
        );
      }

      const ccp = JSON.parse(fs.readFileSync(resolvedProfile, 'utf8'));

      // Load wallet
      const resolvedWallet = path.resolve(walletPath);
      const wallet = await Wallets.newFileSystemWallet(resolvedWallet);

      // Kiểm tra identity tồn tại
      const identity = await wallet.get(userId);
      if (!identity) {
        throw new Error(
          `Identity '${userId}' không tồn tại trong wallet '${resolvedWallet}'.\n` +
          `Hãy chạy: npx ts-node src/modules/blockchain/fabric/wallet-helper.ts`,
        );
      }

      // Khởi tạo Gateway
      this.gateway = new Gateway();
      await this.gateway.connect(ccp, {
        wallet,
        identity: userId,
        discovery: { enabled: true, asLocalhost: true },
      });

      // Lấy contract
      const network = await this.gateway.getNetwork(channelName);
      this.contract = network.getContract(chaincodeName);

      this.logger.log(
        `✅ Hyperledger Fabric gateway initialized | channel: ${channelName} | chaincode: ${chaincodeName}`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to initialize Fabric gateway:', error.message);
      this.logger.warn('⚠️  Falling back to MOCK mode');
      this.useMock = true;
      this.gateway = null;
      this.contract = null;
    }
  }

  private async disconnectGateway(): Promise<void> {
    if (this.gateway) {
      try {
        await this.gateway.disconnect();
        this.logger.log('🔌 Fabric gateway disconnected');
      } catch (_) {
        // ignore on shutdown
      }
    }
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  private generateHash(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private addToHistory(id: string, action: string, data: any) {
    const entry = {
      txId: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      data,
    };
    const existing = this.history.get(id) || [];
    existing.push(entry);
    this.history.set(id, existing);
  }

  /**
   * Parse JSON response từ chaincode (trả về Buffer hoặc string)
   */
  private parseResult<T>(result: Buffer | string): T {
    const str = Buffer.isBuffer(result) ? result.toString('utf8') : result;
    try {
      return JSON.parse(str) as T;
    } catch {
      return str as unknown as T;
    }
  }

  // ─────────────────────────────────────────────
  // ORGANIZATION OPERATIONS
  // ─────────────────────────────────────────────

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
      // Ghi lên Fabric blockchain
      await this.contract.submitTransaction(
        'createOrganization',
        JSON.stringify(asset),
      );
      this.logger.log(`[Fabric] Created organization on-chain: ${id}`);
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
        this.addToHistory(blockchainId, 'VERIFY_ORGANIZATION', {
          adminId,
          timestamp: org.verifiedAt,
        });
        this.logger.log(`[MOCK] Verified organization: ${blockchainId}`);
      }
    } else {
      await this.contract.submitTransaction(
        'verifyOrganization',
        blockchainId,
        adminId,
      );
      this.logger.log(
        `[Fabric] Verified organization on-chain: ${blockchainId}`,
      );
    }
  }

  async getOrganizationHistory(blockchainId: string): Promise<any[]> {
    if (this.useMock) {
      return this.history.get(blockchainId) || [];
    }
    const result = await this.contract.evaluateTransaction(
      'getOrganizationHistory',
      blockchainId,
    );
    return this.parseResult<any[]>(result);
  }

  // ─────────────────────────────────────────────
  // CAMPAIGN OPERATIONS
  // ─────────────────────────────────────────────

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
      await this.contract.submitTransaction(
        'createCampaign',
        JSON.stringify(asset),
      );
      this.logger.log(`[Fabric] Created campaign on-chain: ${id}`);
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
        this.addToHistory(blockchainId, 'VERIFY_CAMPAIGN', {
          adminId,
          timestamp: campaign.verifiedAt,
        });
        this.logger.log(`[MOCK] Verified campaign: ${blockchainId}`);
      }
    } else {
      await this.contract.submitTransaction(
        'verifyCampaign',
        blockchainId,
        adminId,
      );
      this.logger.log(`[Fabric] Verified campaign on-chain: ${blockchainId}`);
    }
  }

  async getCampaignHistory(blockchainId: string): Promise<any[]> {
    if (this.useMock) {
      return this.history.get(blockchainId) || [];
    }
    const result = await this.contract.evaluateTransaction(
      'getCampaignHistory',
      blockchainId,
    );
    return this.parseResult<any[]>(result);
  }

  // ─────────────────────────────────────────────
  // DONATION OPERATIONS
  // ─────────────────────────────────────────────

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

      // Cập nhật campaign amount
      const campaign = this.campaigns.get(input.campaignId);
      if (campaign) {
        campaign.currentAmount += input.amount;
        campaign.updatedAt = new Date().toISOString();
      }

      this.logger.log(`[MOCK] Recorded donation: ${input.id}`);
    } else {
      await this.contract.submitTransaction(
        'recordDonation',
        JSON.stringify(asset),
      );
      this.logger.log(`[Fabric] Recorded donation on-chain: ${input.id}`);
    }

    return input.id;
  }

  async getDonationHistory(donationId: string): Promise<any[]> {
    if (this.useMock) {
      const donation = this.donations.get(donationId);
      return donation ? [{ txId: donationId, ...donation }] : [];
    }
    const result = await this.contract.evaluateTransaction(
      'getDonationHistory',
      donationId,
    );
    return this.parseResult<any[]>(result);
  }

  async getCampaignDonations(campaignId: string): Promise<DonationAsset[]> {
    if (this.useMock) {
      return Array.from(this.donations.values()).filter(
        (d) => d.campaignId === campaignId,
      );
    }
    const result = await this.contract.evaluateTransaction(
      'getCampaignDonations',
      campaignId,
    );
    return this.parseResult<DonationAsset[]>(result);
  }

  // ─────────────────────────────────────────────
  // ADMIN / AUDIT
  // ─────────────────────────────────────────────

  async getAuditLog(
    entityType: 'organization' | 'campaign' | 'donation',
    entityId: string,
  ): Promise<any[]> {
    if (this.useMock) {
      return this.history.get(entityId) || [];
    }

    let txName: string;
    switch (entityType) {
      case 'organization':
        txName = 'getOrganizationHistory';
        break;
      case 'campaign':
        txName = 'getCampaignHistory';
        break;
      case 'donation':
        txName = 'getDonationHistory';
        break;
    }

    const result = await this.contract.evaluateTransaction(txName, entityId);
    return this.parseResult<any[]>(result);
  }

  async getAllOrganizations(): Promise<OrganizationAsset[]> {
    if (this.useMock) {
      return Array.from(this.organizations.values());
    }
    // Rich query hoặc range query nếu chaincode hỗ trợ
    return [];
  }

  async getAllCampaigns(): Promise<CampaignAsset[]> {
    if (this.useMock) {
      return Array.from(this.campaigns.values());
    }
    return [];
  }

  /**
   * Kiểm tra trạng thái kết nối blockchain
   */
  getStatus(): { mode: string; connected: boolean } {
    return {
      mode: this.useMock ? 'mock' : 'production',
      connected: this.useMock ? true : this.contract !== null,
    };
  }
}
