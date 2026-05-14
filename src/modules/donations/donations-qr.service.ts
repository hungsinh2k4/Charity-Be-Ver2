import { Injectable, BadRequestException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import type { BankInfo } from '../organizations/schemas/organization.schema';

export interface VietQRPayload {
    bankBin: string;         // Mã BIN ngân hàng (6 số, VD: 970422 = MB Bank)
    bankName?: string;       // Tên ngân hàng (VD: "MB Bank", "BIDV")
    accountNumber: string;   // Số tài khoản
    accountName: string;     // Tên chủ tài khoản
    amount: number;          // Số tiền (VND)
    transferContent: string; // Nội dung chuyển khoản (mã đối soát)
    campaignTitle?: string;
}

export interface DonationQRResult {
    qrCodeDataUrl: string; // base64 PNG — nhúng thẳng vào <img src="">
    qrCodeSvg: string;     // SVG string
    donationUrl: string;   // URL trang donate (dùng nếu không có bank QR)
    transferContent: string; // Nội dung CK — lưu vào donation record
    bankInfo: {
        bankName: string;
        accountNumber: string;
        accountName: string;
        amount: number;
        currency: string;
    };
    vietqrDeeplink: string; // Deeplink mở thẳng app ngân hàng
}

@Injectable()
export class DonationsQrService {
    /**
     * Sinh QR Code chuẩn VietQR (EMV QR) cho chuyển khoản ngân hàng.
     *
     * Chuẩn VietQR dùng EMV QR Code Specification, tương thích với tất cả
     * app ngân hàng Việt Nam hỗ trợ VietQR (MB Bank, Vietcombank, BIDV, etc.)
     *
     * Định dạng deeplink VietQR:
     * https://img.vietqr.io/image/{bankBin}-{accountNumber}-{template}.png
     *   ?amount={amount}&addInfo={content}&accountName={name}
     */
    async generateBankTransferQR(payload: VietQRPayload): Promise<DonationQRResult> {
        // ── 1. Sinh VietQR deeplink (API công khai, không cần key) ──────────────
        const encodedContent = encodeURIComponent(payload.transferContent);
        const encodedName = encodeURIComponent(payload.accountName);

        const vietqrDeeplink =
            `https://img.vietqr.io/image/${payload.bankBin}-${payload.accountNumber}-compact2.png` +
            `?amount=${payload.amount}` +
            `&addInfo=${encodedContent}` +
            `&accountName=${encodedName}`;

        // ── 2. Sinh EMV QR string theo chuẩn VietQR ────────────────────────────
        const emvQrString = this.buildVietQREmvString({
            bankBin: payload.bankBin,
            accountNumber: payload.accountNumber,
            amount: payload.amount,
            transferContent: payload.transferContent,
        });

        // ── 3. Encode thành QR Code ─────────────────────────────────────────────
        const qrCodeDataUrl = await QRCode.toDataURL(emvQrString, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            margin: 2,
            width: 400,
            color: {
                dark: '#1a1a2e',
                light: '#ffffff',
            },
        });

        const qrCodeSvg = await QRCode.toString(emvQrString, {
            type: 'svg',
            errorCorrectionLevel: 'M',
            margin: 2,
        });

        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
        const donationUrl = `${frontendUrl}/donate?content=${encodedContent}`;

        return {
            qrCodeDataUrl,
            qrCodeSvg,
            donationUrl,
            transferContent: payload.transferContent,
            bankInfo: {
                bankName: payload.bankName ?? payload.accountName, // tên ngân hàng, fallback sang accountName
                accountNumber: payload.accountNumber,
                accountName: payload.accountName,
                amount: payload.amount,
                currency: 'VND',
            },
            vietqrDeeplink,
        };
    }

    /**
     * Sinh chuỗi EMV QR chuẩn VietQR (NAPAS 247).
     *
     * Tham chiếu: https://vietqr.io/portal-service/document
     * Format: TLV (Tag-Length-Value)
     *
     * Tag 00: Payload Format Indicator = "01"
     * Tag 01: Point of Initiation Method = "12" (dynamic) hoặc "11" (static)
     * Tag 38: Merchant Account Info (NAPAS)
     *   Tag 00: GUID = "A000000727"
     *   Tag 01: BIN ngân hàng
     *   Tag 02: Số tài khoản
     * Tag 52: Merchant Category Code = "0000"
     * Tag 53: Transaction Currency = "704" (VND)
     * Tag 54: Transaction Amount
     * Tag 58: Country Code = "VN"
     * Tag 62: Additional Data
     *   Tag 08: Purpose of Transaction (nội dung CK)
     * Tag 63: CRC-16/CCITT-FALSE checksum
     */
    private buildVietQREmvString(params: {
        bankBin: string;
        accountNumber: string;
        amount: number;
        transferContent: string;
    }): string {
        const tlv = (tag: string, value: string) =>
            `${tag}${String(value.length).padStart(2, '0')}${value}`;

        // Tag 38: Merchant Account Info — NAPAS
        const merchantAccountGUID = 'A000000727'; // NAPAS GUID cố định
        const bin = tlv('00', params.bankBin);
        const acct = tlv('01', params.accountNumber);
        const merchantAccount = tlv('38', tlv('00', merchantAccountGUID) + bin + acct);

        // Tag 62: Additional Data Field — nội dung CK
        const purposeOfTransaction = tlv('08', params.transferContent.substring(0, 25));
        const additionalData = tlv('62', purposeOfTransaction);

        // Build chuỗi chưa có CRC
        const amountStr = String(Math.round(params.amount));
        let qrString =
            tlv('00', '01') +            // Payload Format Indicator
            tlv('01', '12') +            // Dynamic QR
            merchantAccount +            // Merchant Account Info
            tlv('52', '0000') +          // MCC
            tlv('53', '704') +           // Currency VND
            tlv('54', amountStr) +       // Amount
            tlv('58', 'VN') +            // Country
            additionalData +             // Nội dung CK
            '6304';                      // Tag 63 (CRC), value sẽ thêm sau

        // Tính CRC-16/CCITT-FALSE
        const crc = this.crc16(qrString);
        qrString += crc.toString(16).toUpperCase().padStart(4, '0');

        return qrString;
    }

    /**
     * CRC-16/CCITT-FALSE (polynomial 0x1021, initial value 0xFFFF)
     */
    private crc16(str: string): number {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
                } else {
                    crc = (crc << 1) & 0xFFFF;
                }
            }
        }
        return crc;
    }

    /**
     * Lấy thông tin ngân hàng từ Organization hoặc User để tạo QR.
     * Trả về null nếu chưa cấu hình bank info.
     */
    extractBankInfo(entity: { bankInfo?: BankInfo }): BankInfo | null {
        return entity?.bankInfo ?? null;
    }

    /**
     * Sinh mã tham chiếu CK độc nhất dạng DON + 8 ký tự uppercase.
     * Ví dụ: DONAB12CD34
     * Đây là nội dung mà người donate ghi vào ô "nội dung chuyển khoản".
     */
    generateTransferCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'DON';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Sinh QR Code từ deeplink VietQR (ảnh PNG lấy từ API vietqr.io).
     * Cách dễ nhất: chỉ cần trả về URL, frontend dùng <img src="url" /> là xong.
     * Không cần tự generate QR.
     */
    buildVietQRImageUrl(params: {
        bankBin: string;
        accountNumber: string;
        amount: number;
        transferContent: string;
        accountName: string;
    }): string {
        return (
            `https://img.vietqr.io/image/${params.bankBin}-${params.accountNumber}-compact2.png` +
            `?amount=${params.amount}` +
            `&addInfo=${encodeURIComponent(params.transferContent)}` +
            `&accountName=${encodeURIComponent(params.accountName)}`
        );
    }

    /**
     * Kiểm tra xem entity có đủ bank info để sinh QR không.
     * Tự động resolve bankBin từ bankName nếu chưa có.
     */
    validateBankInfo(bankInfo: BankInfo | null | undefined, ownerType: string): void {
        if (!bankInfo) {
            throw new BadRequestException(
                `${ownerType} chưa cấu hình tài khoản ngân hàng nhận donate. ` +
                `Vui lòng cập nhật thông tin ngân hàng trước.`,
            );
        }
        if (!bankInfo.accountNumber || !bankInfo.accountName) {
            throw new BadRequestException(
                `Thông tin ngân hàng của ${ownerType} không đầy đủ. Cần có: accountNumber, accountName.`,
            );
        }

        // Auto-resolve bankBin từ bankName nếu chưa có
        if (!bankInfo.bankBin && bankInfo.bankName) {
            const resolved = this.resolveBankBin(bankInfo.bankName);
            if (resolved) {
                (bankInfo as any).bankBin = resolved;
            }
        }

        if (!bankInfo.bankBin) {
            throw new BadRequestException(
                `Thiếu mã BIN ngân hàng (bankBin) cho ${ownerType}. ` +
                `Ví dụ BIDV = 970418, MB Bank = 970422, Vietcombank = 970436. ` +
                `Vui lòng cập nhật lại bankInfo với đủ các trường: bankBin, bankName, accountNumber, accountName.`,
            );
        }
    }

    /**
     * Bảng tra cứu BIN ngân hàng phổ biến tại Việt Nam.
     * Dùng khi user nhập bankName nhưng quên bankBin.
     */
    resolveBankBin(bankName: string): string | null {
        const name = bankName.toUpperCase().trim();
        const map: Record<string, string> = {
            'BIDV': '970418',
            'MB': '970422', 'MB BANK': '970422', 'MBBANK': '970422',
            'VIETCOMBANK': '970436', 'VCB': '970436',
            'TECHCOMBANK': '970407', 'TCB': '970407',
            'VPBANK': '970432', 'VPB': '970432',
            'VIETINBANK': '970415', 'CTG': '970415',
            'AGRIBANK': '970405',
            'ACB': '970416',
            'TPBANK': '970423',
            'SACOMBANK': '970403', 'STB': '970403',
            'HDBANK': '970437',
            'OCBBANK': '970448', 'OCB': '970448',
            'MSBANK': '970426', 'MSB': '970426', 'MARITIME': '970426',
            'SEABANK': '970440',
            'VIETBANK': '970433',
            'ABBANK': '970425',
            'NCBBANK': '970419', 'NCB': '970419',
            'PVCOMBANK': '970412',
            'BACABANK': '970409',
            'KIENLONGBANK': '970452',
            'PGBANK': '970430',
            'GPBANK': '970408',
            'VIETABANK': '970427',
            'NAMABANK': '970428',
            'DONG A BANK': '970406',
            'CBBANK': '970444',
            'INDOCHINA': '970434', 'IVB': '970434',
            'SHB': '970443', 'SHBVN': '970443',
            'VIB': '970441',
            'SAIGONBANK': '970400',
            'BAOVIET BANK': '970438', 'BVBANK': '970438',
        };
        return map[name] ?? null;
    }
}
