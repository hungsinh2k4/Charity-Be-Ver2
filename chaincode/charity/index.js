'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * CharityContract - Hyperledger Fabric Smart Contract
 *
 * Quản lý các bản ghi bất biến cho:
 *   - Organizations (tổ chức từ thiện)
 *   - Campaigns (chiến dịch gây quỹ)
 *   - Donations (khoản quyên góp)
 */
class CharityContract extends Contract {
    constructor() {
        super('CharityContract');
    }

    // Helper: Lấy timestamp deterministic từ Fabric transaction
    _getTxTimestamp(ctx) {
        const ts = ctx.stub.getTxTimestamp();
        return new Date(ts.seconds.low * 1000).toISOString();
    }

    // ─────────────────────────────────────────────
    // ORGANIZATION OPERATIONS
    // ─────────────────────────────────────────────

    /**
     * Tạo tổ chức mới trên blockchain
     * @param {Context} ctx
     * @param {string} assetJSON - JSON string của OrganizationAsset
     */
    async createOrganization(ctx, assetJSON) {
        const asset = JSON.parse(assetJSON);

        // Kiểm tra đã tồn tại chưa
        const exists = await this._assetExists(ctx, asset.id);
        if (exists) {
            throw new Error(`Organization ${asset.id} already exists`);
        }

        asset.docType = 'organization';
        asset.createdAt = this._getTxTimestamp(ctx); // ✅ deterministic

        await ctx.stub.putState(
            this._orgKey(asset.id),
            Buffer.from(JSON.stringify(asset)),
        );

        // Emit event
        ctx.stub.setEvent(
            'OrganizationCreated',
            Buffer.from(JSON.stringify({ id: asset.id, mongoId: asset.mongoId })),
        );

        return asset.id;
    }

    /**
     * Xác minh tổ chức (chỉ admin)
     */
    async verifyOrganization(ctx, orgId, adminId) {
        const key = this._orgKey(orgId);
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Organization ${orgId} not found`);
        }

        const asset = JSON.parse(data.toString());
        asset.verificationStatus = 'VERIFIED';
        asset.verifiedAt = this._getTxTimestamp(ctx); // ✅ deterministic
        asset.verifiedBy = adminId;

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(asset)));

        ctx.stub.setEvent(
            'OrganizationVerified',
            Buffer.from(JSON.stringify({ id: orgId, adminId })),
        );
    }

    /**
     * Lấy thông tin tổ chức
     */
    async getOrganization(ctx, orgId) {
        const data = await ctx.stub.getState(this._orgKey(orgId));
        if (!data || data.length === 0) {
            throw new Error(`Organization ${orgId} not found`);
        }
        return data.toString();
    }

    /**
     * Lấy lịch sử thay đổi của tổ chức
     */
    async getOrganizationHistory(ctx, orgId) {
        const iterator = await ctx.stub.getHistoryForKey(this._orgKey(orgId));
        return this._collectHistory(iterator);
    }

    // ─────────────────────────────────────────────
    // CAMPAIGN OPERATIONS
    // ─────────────────────────────────────────────

    /**
     * Tạo campaign mới trên blockchain
     */
    async createCampaign(ctx, assetJSON) {
        const asset = JSON.parse(assetJSON);

        const exists = await this._assetExists(ctx, this._campaignKey(asset.id));
        if (exists) {
            throw new Error(`Campaign ${asset.id} already exists`);
        }

        const now = this._getTxTimestamp(ctx); // ✅ deterministic - 1 lần gọi cho cả createdAt & updatedAt
        asset.docType = 'campaign';
        asset.currentAmount = 0;
        asset.createdAt = now;
        asset.updatedAt = now;

        await ctx.stub.putState(
            this._campaignKey(asset.id),
            Buffer.from(JSON.stringify(asset)),
        );

        ctx.stub.setEvent(
            'CampaignCreated',
            Buffer.from(JSON.stringify({ id: asset.id, mongoId: asset.mongoId })),
        );

        return asset.id;
    }

    /**
     * Xác minh campaign (chỉ admin)
     */
    async verifyCampaign(ctx, campaignId, adminId) {
        const key = this._campaignKey(campaignId);
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Campaign ${campaignId} not found`);
        }

        const now = this._getTxTimestamp(ctx); // ✅ deterministic
        const asset = JSON.parse(data.toString());
        asset.verificationStatus = 'VERIFIED';
        asset.verifiedAt = now;
        asset.verifiedBy = adminId;
        asset.updatedAt = now;

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(asset)));

        ctx.stub.setEvent(
            'CampaignVerified',
            Buffer.from(JSON.stringify({ id: campaignId, adminId })),
        );
    }

    /**
     * Lấy thông tin campaign
     */
    async getCampaign(ctx, campaignId) {
        const data = await ctx.stub.getState(this._campaignKey(campaignId));
        if (!data || data.length === 0) {
            throw new Error(`Campaign ${campaignId} not found`);
        }
        return data.toString();
    }

    /**
     * Lấy lịch sử campaign
     */
    async getCampaignHistory(ctx, campaignId) {
        const iterator = await ctx.stub.getHistoryForKey(
            this._campaignKey(campaignId),
        );
        return this._collectHistory(iterator);
    }

    // ─────────────────────────────────────────────
    // DONATION OPERATIONS
    // ─────────────────────────────────────────────

    /**
     * Ghi nhận khoản quyên góp - BẤT BIẾN, không thể sửa/xóa
     */
    async recordDonation(ctx, assetJSON) {
        const asset = JSON.parse(assetJSON);

        // Donation không được ghi đè
        const exists = await this._assetExists(
            ctx,
            this._donationKey(asset.id),
        );
        if (exists) {
            throw new Error(`Donation ${asset.id} already recorded`);
        }

        asset.docType = 'donation';

        await ctx.stub.putState(
            this._donationKey(asset.id),
            Buffer.from(JSON.stringify(asset)),
        );

        // Cập nhật currentAmount của campaign
        const campaignKey = this._campaignKey(asset.campaignId);
        const campaignData = await ctx.stub.getState(campaignKey);
        if (campaignData && campaignData.length > 0) {
            const campaign = JSON.parse(campaignData.toString());
            campaign.currentAmount = (campaign.currentAmount || 0) + asset.amount;
            campaign.updatedAt = this._getTxTimestamp(ctx); // ✅ deterministic
            await ctx.stub.putState(
                campaignKey,
                Buffer.from(JSON.stringify(campaign)),
            );
        }

        ctx.stub.setEvent(
            'DonationRecorded',
            Buffer.from(
                JSON.stringify({
                    id: asset.id,
                    campaignId: asset.campaignId,
                    amount: asset.amount,
                }),
            ),
        );

        return asset.id;
    }

    /**
     * Lấy thông tin một donation
     */
    async getDonation(ctx, donationId) {
        const data = await ctx.stub.getState(this._donationKey(donationId));
        if (!data || data.length === 0) {
            throw new Error(`Donation ${donationId} not found`);
        }
        return data.toString();
    }

    /**
     * Lấy lịch sử donation (để audit)
     */
    async getDonationHistory(ctx, donationId) {
        const iterator = await ctx.stub.getHistoryForKey(
            this._donationKey(donationId),
        );
        return this._collectHistory(iterator);
    }

    /**
     * Lấy tất cả donations của một campaign (range query)
     */
    async getCampaignDonations(ctx, campaignId) {
        const prefix = `DONATION_${campaignId}_`;
        const iterator = await ctx.stub.getStateByRange(prefix, prefix + '\xFF');
        const results = [];

        let res = await iterator.next();
        while (!res.done) {
            const value = res.value.value.toString('utf8');
            results.push(JSON.parse(value));
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(results);
    }

    // ─────────────────────────────────────────────
    // UTILITY / KEY HELPERS
    // ─────────────────────────────────────────────

    _orgKey(id) {
        return `ORG_${id}`;
    }

    _campaignKey(id) {
        return `CAMPAIGN_${id}`;
    }

    _donationKey(id) {
        return `DONATION_${id}`;
    }

    async _assetExists(ctx, key) {
        const data = await ctx.stub.getState(key);
        return data && data.length > 0;
    }

    async _collectHistory(iterator) {
        const history = [];
        let res = await iterator.next();
        while (!res.done) {
            const entry = {
                txId: res.value.txId,
                timestamp: new Date(
                    res.value.timestamp.seconds.low * 1000,
                ).toISOString(), // OK: đọc từ Fabric history, không generate
                isDelete: res.value.isDelete,
                data: res.value.value
                    ? JSON.parse(res.value.value.toString('utf8'))
                    : null,
            };
            history.push(entry);
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(history);
    }
}

module.exports.contracts = [CharityContract];
