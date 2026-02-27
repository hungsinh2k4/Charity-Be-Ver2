'use strict';
/**
 * wallet-setup.js
 *
 * Enroll admin + register appUser vào Fabric CA, tạo wallet cho backend.
 * Chạy trực tiếp bằng node (không cần ts-node):
 *
 *   node src/modules/blockchain/fabric/wallet-setup.js
 *
 * Hoặc dùng biến môi trường để override:
 *   FABRIC_CA_URL=https://localhost:7054 \
 *   FABRIC_ADMIN_USER=admin \
 *   FABRIC_ADMIN_PASS=adminpw \
 *   node src/modules/blockchain/fabric/wallet-setup.js
 */

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

// ─── CẤU HÌNH (đọc từ .env hoặc dùng giá trị mặc định) ──────────────────────
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

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
    console.log('─────────────────────────────────────────');
    console.log('  Hyperledger Fabric — Wallet Setup');
    console.log('─────────────────────────────────────────');

    // 1. Kiểm tra connection profile tồn tại
    if (!fs.existsSync(CONNECTION_PROFILE_PATH)) {
        console.error(`❌ Connection profile không tồn tại: ${CONNECTION_PROFILE_PATH}`);
        console.error('   Hãy chạy bước 7 để điền TLS certificates trước.');
        process.exit(1);
    }

    const ccp = JSON.parse(fs.readFileSync(CONNECTION_PROFILE_PATH, 'utf8'));

    // 2. Kiểm tra CA tồn tại trong connection profile
    const availableCAs = Object.keys(ccp.certificateAuthorities || {});
    // Tự động dùng CA đầu tiên nếu CA_NAME không khớp chính xác
    let resolvedCAName = CA_NAME;
    if (!ccp.certificateAuthorities[CA_NAME]) {
        resolvedCAName = availableCAs[0];
        if (!resolvedCAName) {
            console.error('❌ Không tìm thấy CA nào trong connection profile.');
            process.exit(1);
        }
        console.log(`⚠️  CA '${CA_NAME}' không tìm thấy, tự động dùng: '${resolvedCAName}'`);
    }
    const caInfo = ccp.certificateAuthorities[resolvedCAName];

    // 3. Kết nối Fabric CA
    const caTLSCACerts = Array.isArray(caInfo.tlsCACerts.pem)
        ? caInfo.tlsCACerts.pem[0]
        : caInfo.tlsCACerts.pem;

    const ca = new FabricCAServices(caInfo.url, {
        trustedRoots: caTLSCACerts,
        verify: false,
    }, caInfo.caName || CA_NAME);

    console.log(`\n[CA] Kết nối tới: ${caInfo.url}`);

    // 4. Tạo wallet
    if (!fs.existsSync(WALLET_PATH)) {
        fs.mkdirSync(WALLET_PATH, { recursive: true });
    }
    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
    console.log(`[Wallet] Đường dẫn: ${WALLET_PATH}`);

    // ─── ENROLL ADMIN ────────────────────────────────────────────────────────
    const adminExists = await wallet.get(ADMIN_USER);
    if (adminExists) {
        console.log(`\n[Admin] '${ADMIN_USER}' đã tồn tại trong wallet, bỏ qua enroll.`);
    } else {
        console.log(`\n[Admin] Enrolling '${ADMIN_USER}'...`);
        try {
            const enrollment = await ca.enroll({
                enrollmentID: ADMIN_USER,
                enrollmentSecret: ADMIN_PASS,
            });

            const identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: MSP_ID,
                type: 'X.509',
            };

            await wallet.put(ADMIN_USER, identity);
            console.log(`[Admin] ✅ '${ADMIN_USER}' enrolled thành công!`);
        } catch (err) {
            console.error(`[Admin] ❌ Enroll thất bại: ${err.message}`);
            process.exit(1);
        }
    }

    // ─── REGISTER + ENROLL APP USER ──────────────────────────────────────────
    const appUserExists = await wallet.get(APP_USER);
    if (appUserExists) {
        console.log(`\n[AppUser] '${APP_USER}' đã tồn tại trong wallet, bỏ qua register.`);
    } else {
        console.log(`\n[AppUser] Registering '${APP_USER}'...`);
        try {
            // Lấy admin identity để register
            const adminIdentity = await wallet.get(ADMIN_USER);
            if (!adminIdentity) {
                throw new Error(`Admin identity '${ADMIN_USER}' không tồn tại trong wallet`);
            }

            const adminProvider = wallet
                .getProviderRegistry()
                .getProvider(adminIdentity.type);
            const adminUser = await adminProvider.getUserContext(adminIdentity, ADMIN_USER);

            // Register appUser với role client
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
                attr_reqs: [{ name: 'role', optional: false }],
            });

            const identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: MSP_ID,
                type: 'X.509',
            };

            await wallet.put(APP_USER, identity);
            console.log(`[AppUser] ✅ '${APP_USER}' registered và enrolled thành công!`);
        } catch (err) {
            console.error(`[AppUser] ❌ Register thất bại: ${err.message}`);
            process.exit(1);
        }
    }

    // ─── SUMMARY ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────');
    console.log('✅ Wallet setup hoàn tất!');
    console.log('');
    console.log('Các identity trong wallet:');
    const identities = await wallet.list();
    for (const id of identities) {
        console.log(`   ✓ ${id}`);
    }
    console.log('');
    console.log('Bước tiếp theo:');
    console.log('  1. Cập nhật .env: BLOCKCHAIN_MODE=production');
    console.log('  2. Chạy backend:  npm run start:dev');
    console.log('─────────────────────────────────────────');
}

main().catch((err) => {
    console.error('❌ Lỗi không xử lý được:', err);
    process.exit(1);
});
