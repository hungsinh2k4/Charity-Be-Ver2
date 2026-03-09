import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { DonationsService } from './donations.service';
import { DonationsQrService } from './donations-qr.service';
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
  ) { }

  // ─── Tạo Donation ──────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo donation — trả về transferCode (nội dung CK) kèm info QR' })
  @ApiResponse({ status: 201, description: 'Donation tạo thành công, trả về mã tham chiếu CK' })
  @ApiResponse({ status: 404, description: 'Campaign không tồn tại hoặc không active' })
  async create(
    @Body() createDto: CreateDonationDto,
    @Request() req: any,
  ) {
    const userId: string | undefined = req?.user?.userId;
    const donation = await this.donationsService.create(createDto, userId);
    return {
      id: donation._id,
      transferCode: donation.transferCode,
      paymentStatus: donation.paymentStatus,
      amount: donation.amount,
      currency: donation.currency,
      message: `Vui lòng chuyển khoản với nội dung: ${donation.transferCode}`,
    };
  }

  // ─── QR Code ngân hàng ─────────────────────────────────────────────────────

  @Get(':id/payment-qr')
  @ApiOperation({
    summary: 'Lấy QR ngân hàng (VietQR) để thanh toán cho donation',
    description:
      'Trả về QR code chứa số TK ngân hàng của chủ quỹ, số tiền, ' +
      'và nội dung CK = transferCode. Người donate quét QR là tự điền đủ thông tin.',
  })
  @ApiResponse({ status: 200, description: 'QR Code data + thông tin chuyển khoản' })
  @ApiResponse({ status: 400, description: 'Chủ quỹ chưa cấu hình tài khoản ngân hàng' })
  async getPaymentQR(@Param('id') id: string) {
    const { donation, qr, vietqrImageUrl } = await this.donationsService.getDonationQR(id);
    return {
      transferCode: donation.transferCode,
      amount: donation.amount,
      currency: donation.currency,
      paymentStatus: donation.paymentStatus,
      qrCodeDataUrl: qr.qrCodeDataUrl,       // base64 PNG — nhúng vào <img src="">
      vietqrImageUrl,                          // URL ảnh QR từ api.vietqr.io — cũng dùng như <img src="">
      vietqrDeeplink: qr.vietqrDeeplink,       // Mở thẳng app ngân hàng (dành cho mobile)
      bankInfo: qr.bankInfo,
      instruction: {
        step1: 'Mở app ngân hàng và quét QR hoặc chuyển khoản thủ công',
        step2: `Nội dung chuyển khoản: ${donation.transferCode}`,
        step3: 'Hệ thống sẽ tự động xác nhận sau khi nhận được tiền',
      },
    };
  }

  @Get(':id/payment-qr/image')
  @ApiOperation({ summary: 'Ảnh QR PNG trực tiếp (stream) — nhúng thẳng vào <img src="..."> trên frontend' })
  @ApiResponse({ status: 200, description: 'PNG image stream' })
  async getPaymentQRImage(
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    const { qr } = await this.donationsService.getDonationQR(id);
    const base64Data = qr.qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(imgBuffer);
  }

  // ─── Tra cứu & Xác nhận theo mã CK ────────────────────────────────────────

  @Get('lookup/:transferCode')
  @ApiOperation({
    summary: 'Tra cứu donation theo mã chuyển khoản (DON...)',
    description: 'Admin hoặc user tra cứu trạng thái donation bằng mã nội dung CK',
  })
  @ApiResponse({ status: 200, description: 'Thông tin donation' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy mã' })
  async lookupByTransferCode(@Param('transferCode') transferCode: string) {
    return this.donationsService.findByTransferCode(transferCode);
  }

  @Post('confirm/:transferCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xác nhận donation đã chuyển khoản (Admin)',
    description:
      'Admin tra ngân hàng thấy giao dịch có nội dung DON..., gọi endpoint này để xác nhận. ' +
      'Hệ thống sẽ cộng tiền vào campaign và đánh dấu donation là CONFIRMED.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        adminNote: { type: 'string', example: 'Đã nhận GD 14:32 ngày 07/03/2026, ref: VCB12345' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Donation xác nhận thành công' })
  @ApiResponse({ status: 404, description: 'Mã không tồn tại' })
  @ApiResponse({ status: 400, description: 'Donation đã được xác nhận rồi' })
  async confirmTransfer(
    @Param('transferCode') transferCode: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.donationsService.confirmTransferByCode(transferCode, adminNote);
  }

  // ─── Các endpoint cũ ───────────────────────────────────────────────────────

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe email to campaign updates' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async subscribeToUpdates(@Body() body: { campaignId: string; email: string }) {
    return this.donationsService.subscribeToUpdates(body.campaignId, body.email);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách donation của user đang đăng nhập' })
  async findMyDonations(@CurrentUser() user: AuthenticatedUser) {
    return this.donationsService.findByUser(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Thống kê donation (chỉ đếm CONFIRMED)' })
  @ApiQuery({ name: 'campaignId', required: false })
  async getStats(@Query('campaignId') campaignId?: string) {
    return this.donationsService.getStats(campaignId);
  }

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Lấy tất cả donations của một campaign' })
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.donationsService.findByCampaign(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy donation theo ID' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  async findOne(@Param('id') id: string) {
    return this.donationsService.findById(id);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Xác minh donation trên blockchain' })
  async verifyOnBlockchain(@Param('id') id: string) {
    return this.donationsService.verifyOnBlockchain(id);
  }
}
