import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface VietQRTransaction {
  /** Mã giao dịch ngân hàng */
  txRef: string;
  /** Số tiền thực tế (VND) */
  amount: number;
  /** Nội dung chuyển khoản — chứa transferCode */
  description: string;
  /** Thời điểm giao dịch */
  transactedAt: Date;
  /** Trạng thái: 1 = thành công */
  status: number;
}

export interface VietQRCheckResult {
  /** Giao dịch khớp transferCode và amount */
  matched: boolean;
  /** Thông tin giao dịch nếu khớp */
  transaction?: VietQRTransaction;
}

/**
 * VietQRPaymentService — Tích hợp với API ngân hàng / VietQR để kiểm tra
 * trạng thái giao dịch chuyển khoản.
 *
 * Chiến lược:
 *   1. WEBHOOK (ưu tiên): Ngân hàng/VietQR gọi POST /donations/webhook/vietqr
 *      khi có GD mới → hệ thống đối soát ngay lập tức.
 *   2. POLLING (dự phòng): Cron job mỗi 2 phút gọi API sao kê để kiểm tra
 *      các PendingDonation đang WAITING_PAYMENT.
 *
 * NOTE: Tích hợp thực tế phụ thuộc vào ngân hàng bạn dùng:
 *   - MB Bank: dùng MB Open API
 *   - VPBank: dùng VPBank Open API
 *   - Hoặc dùng dịch vụ trung gian: Sepay, Casso, PayOS...
 *   Hàm checkTransaction() cần được implement theo từng provider.
 */
@Injectable()
export class VietQRPaymentService {
  private readonly logger = new Logger(VietQRPaymentService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Kiểm tra xem có giao dịch nào khớp với transferCode và amount không.
   * Gọi API sao kê ngân hàng (Sepay / Casso / bank open API).
   *
   * @param accountNumber - Số tài khoản nhận tiền
   * @param transferCode  - Mã đối soát (nội dung CK)
   * @param amount        - Số tiền cần khớp
   * @param fromDate      - Kiểm tra từ thời điểm này (≈ thời điểm tạo PendingDonation)
   * @param campaignApiKey - SePay API key của campaign
   */
  async checkTransaction(
    accountNumber: string,
    transferCode: string,
    amount: number,
    fromDate: Date,
    campaignApiKey?: string,
  ): Promise<VietQRCheckResult> {
    // ─── Chọn provider tùy config — default 'mock' để dev không cần cấu hình gì thêm ───
    const provider = this.configService.get<string>('PAYMENT_PROVIDER', 'mock');

    switch (provider) {
      case 'sepay':
        return this.checkViaSepay(accountNumber, transferCode, amount, fromDate, campaignApiKey);
      case 'casso':
        return this.checkViaCasso(accountNumber, transferCode, amount, fromDate);
      case 'mock':
        return this.mockCheck(transferCode, amount);
      default:
        this.logger.warn(`Unknown payment provider: ${provider}, falling back to mock`);
        return { matched: false };
    }
  }

  // ─── Sepay Integration ────────────────────────────────────────────────────────────
  /**
   * Sepay (https://sepay.vn) — dịch vụ nhận webhook ngân hàng phổ biến tại VN.
   * Cung cấp API lịch sử GD theo accountNumber.
   *
   * @param campaignApiKey - API key của campaign
   */
  private async checkViaSepay(
    accountNumber: string,
    transferCode: string,
    amount: number,
    fromDate: Date,
    campaignApiKey?: string,
  ): Promise<VietQRCheckResult> {
    const apiKey = campaignApiKey;
    const baseUrl = this.configService.get<string>('SEPAY_API_URL', 'https://my.sepay.vn/userapi');

    if (!apiKey) {
      this.logger.warn('Không có sepayApiKey — bỏ qua check Sepay');
      return { matched: false };
    }

    const keySource = campaignApiKey ? 'campaign-level' : 'env-global';

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/transactions/list`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          params: {
            // Không filter theo account_number vì Sepay dùng VA (Virtual Account)
            // khác với số TK thật trong bankInfo. API key đã scoped vào TK của user.
            limit: 20,
            transaction_date_min: fromDate.toISOString().slice(0, 10),
          },
        }),
      );

      const transactions: any[] = response.data?.transactions ?? [];

      this.logger.debug(
        `[${keySource}] Sepay trả về ${transactions.length} GD, tìm mã: ${transferCode}`,
      );

      // Match theo transaction_content (field thực tế từ Sepay API)
      // Incoming = amount_in > 0 (Sepay không có transferType)
      const matched = transactions.find(
        (tx: any) =>
          Number(tx.amount_in) > 0 &&
          tx.transaction_content?.toUpperCase().includes(transferCode.toUpperCase()),
      );

      if (matched) {
        this.logger.log(
          `✅ Sepay khớp GD: ${matched.transaction_content} | ${matched.amount_in} VND`,
        );
        return {
          matched: true,
          transaction: {
            txRef: matched.reference_number ?? matched.id?.toString(),
            amount: Number(matched.amount_in),
            description: matched.transaction_content,
            transactedAt: new Date(matched.transaction_date),
            status: 1,
          },
        };
      }

      this.logger.debug(
        `Chưa thấy GD khớp ${transferCode} trong ${transactions.length} GD`,
      );
      return { matched: false };

    } catch (error) {
      this.logger.error('Sepay API error', error?.response?.data || error.message);
      return { matched: false };
    }

  }

  // ─── Casso Integration ────────────────────────────────────────────────────
  /**
   * Casso (https://casso.vn) — dịch vụ đồng bộ sao kê ngân hàng.
   */
  private async checkViaCasso(
    accountNumber: string,
    transferCode: string,
    amount: number,
    fromDate: Date,
  ): Promise<VietQRCheckResult> {
    const apiKey = this.configService.get<string>('CASSO_API_KEY');
    const baseUrl = this.configService.get<string>('CASSO_API_URL', 'https://oauth.casso.vn/v2');

    if (!apiKey) {
      this.logger.warn('CASSO_API_KEY không được cấu hình');
      return { matched: false };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/transactions`, {
          headers: { Authorization: `ApiKey ${apiKey}` },
          params: {
            bankAcc: accountNumber,
            fromDate: fromDate.toISOString().slice(0, 10),
            pageSize: 20,
            sort: 'DESC',
          },
        }),
      );

      const records: any[] = response.data?.data?.records ?? [];

      const matched = records.find(
        (tx: any) =>
          tx.description?.toUpperCase().includes(transferCode.toUpperCase()) &&
          Number(tx.amount) === amount &&
          tx.when >= 0, // amount_in
      );

      if (matched) {
        return {
          matched: true,
          transaction: {
            txRef: matched.tid?.toString() ?? matched.id?.toString(),
            amount: Number(matched.amount),
            description: matched.description,
            transactedAt: new Date(matched.when * 1000),
            status: 1,
          },
        };
      }

      return { matched: false };
    } catch (error) {
      this.logger.error('Casso API error', error?.response?.data || error.message);
      return { matched: false };
    }
  }

  // ─── Mock (dev/test) ──────────────────────────────────────────────────────
  /**
   * Mock provider — dùng khi PAYMENT_PROVIDER=mock (dev/test).
   * Luôn trả về matched=true để test luồng xác nhận hoàn chỉnh.
   * Có thể set MOCK_PAYMENT_SHOULD_FAIL=true để test trường hợp thất bại.
   */
  private mockCheck(transferCode: string, amount: number): VietQRCheckResult {
    const shouldFail = this.configService.get<string>('MOCK_PAYMENT_SHOULD_FAIL') === 'true';
    if (shouldFail) {
      this.logger.debug(`[MOCK] Giả vờ không tìm thấy GD cho ${transferCode}`);
      return { matched: false };
    }

    this.logger.debug(`[MOCK] Giả vờ đã nhận ${amount} VND, mã: ${transferCode}`);
    return {
      matched: true,
      transaction: {
        txRef: `MOCK-${Date.now()}`,
        amount,
        description: `CHUYEN KHOAN ${transferCode}`,
        transactedAt: new Date(),
        status: 1,
      },
    };
  }

  /**
   * Parse webhook payload từ Sepay (gọi khi có event webhook mới).
   * Trả về transferCode từ nội dung CK (nếu khớp pattern DON...).
   */
  parseSepayWebhook(payload: any): {
    transferCode: string | null;
    amount: number;
    txRef: string;
    accountNumber: string;
    transactedAt: Date;
  } | null {
    try {
      // Sepay webhook dùng cùng field name với API list:
      // transaction_content, amount_in, transaction_date, reference_number,
      // account_number, sub_account, bank_brand_name, bank_account_id
      const content: string = payload.transaction_content ?? payload.content ?? '';
      const amount = Number(payload.amount_in ?? payload.transferAmount ?? 0);
      const txRef = payload.reference_number ?? payload.referenceCode ?? payload.id?.toString() ?? '';
      const accountNumber = payload.account_number ?? payload.sub_account ?? payload.accountNumber ?? '';
      const transactedAt = payload.transaction_date
        ? new Date(payload.transaction_date)
        : new Date();

      // Sepay có field 'code' là mã tự detect — dùng trước, fallback sang regex
      let transferCode: string | null = null;
      if (payload.code && /^DON[A-Z0-9]{8}$/i.test(payload.code)) {
        transferCode = payload.code.toUpperCase();
      } else {
        const match = content.match(/DON[A-Z0-9]{8}/i);
        transferCode = match ? match[0].toUpperCase() : null;
      }

      return { transferCode, amount, txRef, accountNumber, transactedAt };
    } catch {
      return null;
    }
  }


  /**
   * Parse webhook payload từ Casso.
   */
  parseCassoWebhook(payload: any): {
    transferCode: string | null;
    amount: number;
    txRef: string;
    accountNumber: string;
    transactedAt: Date;
  } | null {
    try {
      // Casso webhook format:
      // { id, tid, description, amount, when, bankSubAccId, ... }
      const records: any[] = payload.data ?? [payload];
      if (!records.length) return null;

      // Xử lý record đầu tiên (mỗi webhook thường 1 GD)
      const record = records[0];
      const content: string = record.description ?? '';
      const amount = Number(record.amount ?? 0);
      const txRef = record.tid?.toString() ?? record.id?.toString() ?? '';
      const accountNumber = record.bankSubAccId ?? '';
      const transactedAt = record.when ? new Date(record.when * 1000) : new Date();

      const match = content.match(/DON[A-Z0-9]{8}/i);
      const transferCode = match ? match[0].toUpperCase() : null;

      return { transferCode, amount, txRef, accountNumber, transactedAt };
    } catch {
      return null;
    }
  }
  /**
   * Test Sepay API key: gọi API và trả về 5 GD gần nhất của số TK đã chỉ định.
   * Dùng cho debug endpoint GET /donations/debug/sepay-ping.
   */
  async pingCheck(accountNumber: string, apiKey: string): Promise<{
    ok: boolean;
    provider: string;
    message: string;
    recentTransactions?: any[];
    error?: string;
  }> {
    const provider = this.configService.get<string>('PAYMENT_PROVIDER', 'mock');
    const baseUrl = this.configService.get<string>('SEPAY_API_URL', 'https://my.sepay.vn/userapi');

    if (provider !== 'sepay') {
      return {
        ok: false,
        provider,
        message: `PAYMENT_PROVIDER hiện tại là "${provider}", không phải sepay. Đổi thành PAYMENT_PROVIDER=sepay trong .env.`,
      };
    }

    if (!apiKey) {
      return {
        ok: false,
        provider,
        message: 'sepayApiKey không được cung cấp.',
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/transactions/list`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          params: { account_number: accountNumber, limit: 5 },
          timeout: 8000,
        }),
      );

      const transactions: any[] = response.data?.transactions ?? [];
      return {
        ok: true,
        provider,
        message: `✅ Sepay API hoạt động tốt! Tìm thấy ${transactions.length} GD gần nhất cho TK ${accountNumber}.`,
        recentTransactions: transactions.map((tx) => ({
          id: tx.id,
          content: tx.content,
          transferAmount: tx.transferAmount,
          transferType: tx.transferType,
          transactionDate: tx.transactionDatestring ?? tx.transactionDate,
        })),
      };
    } catch (error) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.message ?? error.message;
      return {
        ok: false,
        provider,
        message: status === 401
          ? '❌ sepayApiKey không hợp lệ (401 Unauthorized) — kiểm tra lại key trong Sepay Dashboard.'
          : `❌ Lỗi kết nối Sepay: ${detail}`,
        error: detail,
      };
    }
  }
}
