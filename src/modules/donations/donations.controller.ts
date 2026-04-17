import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { DonationsService } from './donations.service';
import { DonationsQrService } from './donations-qr.service';
import { PendingDonationsService } from './pending-donations.service';
import { VietQRPaymentService } from './vietqr-payment.service';
import { CreateDonationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/interfaces';

@ApiTags('Donations')
@Controller('donations')
export class DonationsController {
  constructor(
    private donationsService: DonationsService,
    private donationsQrService: DonationsQrService,
    private pendingDonationsService: PendingDonationsService,
    private vietqrPaymentService: VietQRPaymentService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DEBUG — chỉ dùng khi dev/test
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Test Sepay API key có hợp lệ không và đang đọc được số TK nào.
   * Chức năng: gọi Sepay API trực tiếp và trả về danh sách GD gần nhất.
   */
  @Get('debug/sepay-ping')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[DEBUG] Test Sepay API key — kiểm tra key có hoạt động không',
    description:
      'Gọi Sepay API với sepayApiKey và accountNumber, trả về 5 GD gần nhất. ' +
      'Nếu thấy danh sách "transactions", key hoạt động tốt.',
  })
  @ApiQuery({ name: 'accountNumber', required: true, description: 'Số TK ngân hàng đã liên kết Sepay' })
  @ApiQuery({ name: 'sepayApiKey', required: true, description: 'Sepay API key từ Dashboard Sepay' })
  @ApiResponse({ status: 200, description: 'Kết quả từ Sepay API' })
  async debugSepayPing(
    @Query('accountNumber') accountNumber: string,
    @Query('sepayApiKey') sepayApiKey: string,
  ) {
    return this.vietqrPaymentService.pingCheck(accountNumber, sepayApiKey);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LUỒNG MỚI: Initiate → QR → Webhook/Poll → Confirm → Donation thật
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * BƯỚC 1: Donor khởi tạo donation → hệ thống tạo PendingDonation + transferCode.
   * Donation thật CHỈ được tạo sau khi VietQR xác nhận tiền về.
   */
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[BƯỚC 1] Khởi tạo donation — nhận transferCode để chuyển khoản',
    description:
      'Tạo một PendingDonation với mã tham chiếu (transferCode). ' +
      'Donation thật chỉ được lưu vào lịch sử SAU KHI hệ thống xác nhận tiền đã về qua VietQR webhook hoặc polling. ' +
      'Sau khi gọi API này, frontend hiển thị QR VietQR để donor quét và chuyển khoản.',
  })
  @ApiResponse({ status: 201, description: 'PendingDonation tạo thành công — donor cần chuyển khoản' })
  @ApiResponse({ status: 400, description: 'Campaign không active hoặc chưa cấu hình TK ngân hàng' })
  async create(@Body() createDto: CreateDonationDto, @Request() req: any) {
    const userId: string | undefined = req?.user?.userId;
    return this.pendingDonationsService.initiateDonation(createDto, userId);
  }

  /**
   * BƯỚC 2: Lấy QR VietQR để donor quét → chuyển khoản ngân hàng.
   */
  @Get(':pendingId/payment-qr')
  @ApiOperation({
    summary: '[BƯỚC 2] Lấy QR VietQR để chuyển khoản',
    description:
      'Trả về QR code chứa số TK nhận tiền, số tiền, và nội dung CK = transferCode. ' +
      'Donor quét QR bằng app ngân hàng là tự điền đủ thông tin.',
  })
  @ApiResponse({ status: 200, description: 'QR data + thông tin chuyển khoản' })
  @ApiResponse({ status: 400, description: 'Donation đã hết hạn hoặc đã xác nhận' })
  async getPaymentQR(@Param('pendingId') pendingId: string) {
    const { pending, qr, vietqrImageUrl } =
      await this.pendingDonationsService.getPendingDonationQR(pendingId);

    return {
      pendingId: pending._id,
      transferCode: pending.transferCode,
      amount: pending.amount,
      currency: pending.currency,
      status: pending.status,
      expiresAt: pending.expiresAt,
      qrCodeDataUrl: qr.qrCodeDataUrl,
      vietqrImageUrl,
      vietqrDeeplink: qr.vietqrDeeplink,
      bankInfo: qr.bankInfo,
      instruction: {
        step1: 'Mở app ngân hàng và quét QR hoặc chuyển khoản thủ công',
        step2: `Số tiền: ${pending.amount.toLocaleString('vi-VN')} VND`,
        step3: `Nội dung CK: ${pending.transferCode} (quan trọng — điền chính xác)`,
        step4: 'Hệ thống tự động xác nhận trong vài phút sau khi nhận được tiền',
      },
    };
  }

  @Get(':pendingId/payment-qr/image')
  @ApiOperation({ summary: 'Ảnh QR PNG (stream) — nhúng thẳng vào <img src="..."> trên frontend' })
  @ApiResponse({ status: 200, description: 'PNG image stream' })
  async getPaymentQRImage(@Res() res: Response, @Param('pendingId') pendingId: string) {
    const { qr } = await this.pendingDonationsService.getPendingDonationQR(pendingId);
    const base64Data = qr.qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(imgBuffer);
  }

  /**
   * BƯỚC 3A (Tự động): Frontend polling trạng thái — hiển thị cho donor biết
   * tiền đã về chưa mà không cần reload trang.
   */
  @Get(':pendingId/status')
  @ApiOperation({
    summary: '[BƯỚC 3] Frontend poll trạng thái donation (donor đang chờ xác nhận)',
    description:
      'Frontend gọi API này mỗi 5-10 giây để kiểm tra xem donation đã được xác nhận chưa. ' +
      'Khi status = "payment_confirmed", redirect donor đến trang thành công.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái pending donation',
    schema: {
      example: {
        status: 'waiting_payment | checking | payment_confirmed | expired',
        transferCode: 'DONAB12CD',
        amount: 100000,
        expiresAt: '2026-03-18T16:30:00Z',
        donationId: '60c72b2f9b1d8e001c8e4b5a',
      },
    },
  })
  async getDonationStatus(@Param('pendingId') pendingId: string) {
    const pending = await this.pendingDonationsService.findPendingById(pendingId);

    // Nếu đã confirmed → tìm Donation thật để trả về donationId
    if (pending.status === 'payment_confirmed') {
      const donation = await this.donationsService.findByTransferCode(pending.transferCode);
      return {
        status: pending.status,
        transferCode: pending.transferCode,
        amount: pending.amount,
        donationId: donation?._id ?? null,
        paidAt: (donation as any)?.paidAt ?? null,
      };
    }

    // Nếu đang chờ thanh toán → trigger poll ngay lập tức (fire-and-forget)
    // Không await — không cần chờ kết quả, frontend sẽ poll lại sau 3-5 giây
    if (
      pending.status === 'waiting_payment' &&
      pending.bankInfoSnapshot &&
      new Date() < pending.expiresAt
    ) {
      this.pendingDonationsService.pollSinglePending(pending).catch(() => { /* non-fatal */ });
    }

    return {
      status: pending.status,
      transferCode: pending.transferCode,
      amount: pending.amount,
      expiresAt: pending.expiresAt,
      remainingSeconds: Math.max(
        0,
        Math.floor((pending.expiresAt.getTime() - Date.now()) / 1000),
      ),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK ENDPOINTS — Ngân hàng / VietQR gọi vào
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Webhook từ Sepay — tự động xác nhận donation khi ngân hàng báo có GD mới.
   * Cấu hình webhook URL này trong dashboard Sepay.
   */
  @Post('webhook/sepay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[WEBHOOK] Nhận thông báo GD từ Sepay',
    description:
      'Sepay gọi endpoint này khi phát hiện GD mới trong TK ngân hàng được liên kết. ' +
      'Hệ thống sẽ tự động tìm PendingDonation khớp transferCode và xác nhận.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleSepayWebhook(@Body() payload: any, @Headers() headers: any) {
    // TODO: Xác thực chữ ký webhook từ Sepay (x-sepay-signature header)
    this.validateSepaySignature(headers, payload);

    return this.pendingDonationsService.handleSepayWebhook(payload);
  }

  /**
   * Webhook từ Casso — tự động xác nhận donation.
   */
  @Post('webhook/casso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[WEBHOOK] Nhận thông báo GD từ Casso',
    description: 'Casso gọi endpoint này khi phát hiện GD mới.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleCassoWebhook(@Body() payload: any, @Headers() headers: any) {
    // TODO: Xác thực Casso API key từ header
    return this.pendingDonationsService.handleCassoWebhook(payload);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN: Xác nhận thủ công (fallback)
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('confirm/:transferCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Xác nhận donation thủ công theo mã CK',
    description:
      'Admin tra ngân hàng thấy GD có nội dung DON..., gọi API này để xác nhận. ' +
      'Hệ thống sẽ tạo Donation thật, cộng tiền vào campaign, ghi blockchain.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        adminNote: {
          type: 'string',
          example: 'Đã nhận GD 14:32 ngày 18/03/2026, ref: VCB12345',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Donation xác nhận thành công — Donation record đã tạo' })
  @ApiResponse({ status: 400, description: 'Đã xác nhận rồi hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Mã không tồn tại' })
  async confirmTransfer(
    @Param('transferCode') transferCode: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.pendingDonationsService.adminConfirmByCode(transferCode, adminNote);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRA CỨU
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('lookup/:transferCode')
  @ApiOperation({
    summary: 'Tra cứu donation theo mã CK (DON...)',
    description:
      'Tìm kiếm trong cả PendingDonation (chưa xác nhận) và Donation (đã confirmed).',
  })
  @ApiResponse({ status: 200, description: 'Thông tin donation' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy mã' })
  async lookupByTransferCode(@Param('transferCode') transferCode: string) {
    // Kiểm tra PendingDonation trước
    const pending =
      await this.pendingDonationsService.findPendingByTransferCode(transferCode);
    if (pending) {
      return {
        source: 'pending',
        status: pending.status,
        transferCode: pending.transferCode,
        amount: pending.amount,
        expiresAt: pending.expiresAt,
      };
    }

    // Tìm trong Donation đã confirmed
    const donation = await this.donationsService.findByTransferCode(transferCode);
    return {
      source: 'confirmed',
      status: 'confirmed',
      ...donation.toObject(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DANH SÁCH & THỐNG KÊ (chỉ trả về Donation đã CONFIRMED)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách donation đã xác nhận của user đang đăng nhập' })
  async findMyDonations(@CurrentUser() user: AuthenticatedUser) {
    return this.donationsService.findByUser(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Thống kê donation đã xác nhận (CONFIRMED)' })
  @ApiQuery({ name: 'campaignId', required: false })
  async getStats(@Query('campaignId') campaignId?: string) {
    return this.donationsService.getStats(campaignId);
  }

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Lấy tất cả donations đã CONFIRMED của một campaign' })
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.donationsService.findByCampaign(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy donation đã confirmed theo ID' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  async findOne(@Param('id') id: string) {
    return this.donationsService.findById(id);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Xác minh donation trên blockchain' })
  async verifyOnBlockchain(@Param('id') id: string) {
    return this.donationsService.verifyOnBlockchain(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers (private)
  // ═══════════════════════════════════════════════════════════════════════════

  private validateSepaySignature(headers: any, payload: any): void {
    // TODO: Triển khai xác thực HMAC signature từ Sepay
    // const signature = headers['x-sepay-signature'];
    // const expectedSig = hmac(SEPAY_WEBHOOK_SECRET, JSON.stringify(payload));
    // if (signature !== expectedSig) throw new UnauthorizedException('Invalid webhook signature');
  }
}
