import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * DTO chứa thông tin ngân hàng để nhận donate qua QR VietQR
 *
 * Để tìm bankBin, xem danh sách tại:
 * https://api.vietqr.io/v2/banks
 *
 * Các ngân hàng phổ biến:
 *  - Vietcombank  : 970436
 *  - MB Bank      : 970422
 *  - Techcombank  : 970407
 *  - VPBank       : 970432
 *  - Vietinbank   : 970415
 *  - BIDV         : 970418
 *  - Agribank     : 970405
 *  - ACB          : 970416
 *  - TPBank       : 970423
 *  - OCB          : 970448
 *  - SHB          : 970443
 *  - HDBank       : 970437
 *  - VIB          : 970441
 *  - Sacombank    : 970403
 *  - MSB          : 970426
 *  - SeABank      : 970440
 *  - LPBank       : 970449
 *  - ABBank       : 970425
 */
export class BankInfoDto {
    @ApiProperty({
        description: 'Tên ngân hàng',
        example: 'MB Bank',
    })
    @IsString()
    @IsNotEmpty()
    bankName: string;

    @ApiProperty({
        description: 'Mã BIN ngân hàng theo chuẩn VietQR (6 chữ số)',
        example: '970422',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{6}$/, { message: 'bankBin phải là 6 chữ số (VD: 970422 cho MB Bank)' })
    bankBin: string;

    @ApiProperty({
        description: 'Số tài khoản ngân hàng',
        example: '0123456789',
    })
    @IsString()
    @IsNotEmpty()
    accountNumber: string;

    @ApiProperty({
        description: 'Tên chủ tài khoản (in hoa, không dấu, đúng như trên sổ ngân hàng)',
        example: 'NGUYEN VAN AN',
    })
    @IsString()
    @IsNotEmpty()
    accountName: string;
}
