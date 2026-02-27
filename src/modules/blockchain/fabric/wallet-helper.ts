/**
 * wallet-helper.ts
 *
 * Script để enroll admin user vào Fabric CA và tạo wallet
 * Chạy một lần trước khi khởi động backend:
 *   npm run blockchain:setup
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FabricCAServices = require('fabric-ca-client');
import { Wallets } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

const CONNECTION_PROFILE_PATH = path.resolve(
    __dirname,
    '../../../../fabric/connection-profile.json',
);
const WALLET_PATH = path.resolve(process.cwd(), 'wallet');
const CA_NAME = process.env.FABRIC_CA_NAME || 'ca-org1';
const ADMIN_USER = process.env.FABRIC_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.FABRIC_ADMIN_PASS || 'adminpw';
const APP_USER = process.env.FABRIC_USER_ID || 'appUser';
const MSP_ID = process.env.FABRIC_MSP_ID || 'Org1MSP';

async function main() {
    try {
        // Đọc connection profile
        if (!fs.existsSync(CONNECTION_PROFILE_PATH)) {
            throw new Error(
                `Connection profile không tồn tại: ${CONNECTION_PROFILE_PATH}\nHãy cập nhật fabric/connection-profile.json với thông tin mạng Fabric của bạn.`,
            );
        }

        const ccp = JSON.parse(fs.readFileSync(CONNECTION_PROFILE_PATH, 'utf8'));

        // Kết nối Fabric CA
        const caInfo = ccp.certificateAuthorities[CA_NAME];
        if (!caInfo) {
            throw new Error(`Không tìm thấy CA '${CA_NAME}' trong connection profile`);
        }

        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, {
            trustedRoots: caTLSCACerts,
            verify: false,
        });

        // Tạo wallet
        const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
        console.log(`[Wallet] Đường dẫn wallet: ${WALLET_PATH}`);

        // Kiểm tra admin đã enroll chưa
        const adminExists = await wallet.get(ADMIN_USER);
        if (!adminExists) {
            console.log(`[Enroll] Đang enroll admin user '${ADMIN_USER}'...`);
            const enrollment = await ca.enroll({
                enrollmentID: ADMIN_USER,
                enrollmentSecret: ADMIN_PASS,
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: MSP_ID,
                type: 'X.509',
            };

            await wallet.put(ADMIN_USER, x509Identity);
            console.log(`[Enroll] ✅ Admin '${ADMIN_USER}' enrolled thành công`);
        } else {
            console.log(`[Enroll] Admin '${ADMIN_USER}' đã tồn tại trong wallet`);
        }

        // Kiểm tra appUser đã register chưa
        const appUserExists = await wallet.get(APP_USER);
        if (!appUserExists) {
            console.log(`[Register] Đang register app user '${APP_USER}'...`);

            // Sử dụng admin để register appUser
            const adminIdentity = await wallet.get(ADMIN_USER);
            if (!adminIdentity) {
                throw new Error(`Admin identity '${ADMIN_USER}' không tồn tại trong wallet`);
            }
            const adminProvider = wallet
                .getProviderRegistry()
                .getProvider(adminIdentity.type);
            const adminUser = await adminProvider.getUserContext(adminIdentity, ADMIN_USER);

            // Register appUser với Fabric CA
            const secret = await ca.register(
                {
                    affiliation: 'org1.department1',
                    enrollmentID: APP_USER,
                    role: 'client',
                    attrs: [{ name: 'role', value: 'appUser', ecert: true }],
                },
                adminUser,
            );

            // Enroll appUser
            const enrollment = await ca.enroll({
                enrollmentID: APP_USER,
                enrollmentSecret: secret,
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: MSP_ID,
                type: 'X.509',
            };

            await wallet.put(APP_USER, x509Identity);
            console.log(`[Register] ✅ App User '${APP_USER}' registered và enrolled thành công`);
        } else {
            console.log(`[Register] App User '${APP_USER}' đã tồn tại trong wallet`);
        }

        console.log('\n✅ Wallet setup hoàn tất! Bạn có thể khởi động backend.');
    } catch (error) {
        console.error('❌ Lỗi setup wallet:', error.message);
        process.exit(1);
    }
}

main();
