'use strict';
/**
 * wallet-setup.js
 *
 * Enroll admin + register appUser vào Fabric CA, tạo wallet cho backend.
 * Chạy trực tiếp bằng node (không cần ts-node):
 *
 *   node src/modules/blockchain/fabric/wallet-setup.js
 */

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

// ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

// wallet-setup.js chạy từ WSL nên dùng connection-org1.json trực tiếp từ test-network
const CONN_PROFILE_WSL = process.env.FABRIC_CA_CONNECTION_PROFILE ||
    `${process.env.HOME}/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json`;

// Fallback về file cũ nếu cần
const CONN_PROFILE_FALLBACK = path.resolve(__dirname, '../../../../fabric/connection-profile.json');

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

    // 1. Load connection profile
    let ccpPath = CONN_PROFILE_WSL;
    if (!fs.existsSync(ccpPath)) {
        ccpPath = CONN_PROFILE_FALLBACK;
        if (!fs.existsSync(ccpPath)) {
            console.error(`❌ Không tìm thấy connection profile:`);
            console.error(`   ${CONN_PROFILE_WSL}`);
            console.error(`   ${CONN_PROFILE_FALLBACK}`);
            process.exit(1);
        }
    }
    console.log(`[Profile] Dùng: ${ccpPath}`);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // 2. Tìm CA trong connection profile
    const availableCAs = Object.keys(ccp.certificateAuthorities || {});
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

    const ca = new FabricCAServices(
        caInfo.url,
        { trustedRoots: caTLSCACerts, verify: false },
        caInfo.caName || resolvedCAName,
    );
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
        console.log(`\n[Admin] '${ADMIN_USER}' đã có trong wallet.`);
    } else {
        console.log(`\n[Admin] Enrolling '${ADMIN_USER}'...`);
        try {
            const enrollment = await ca.enroll({
                enrollmentID: ADMIN_USER,
                enrollmentSecret: ADMIN_PASS,
            });
            await wallet.put(ADMIN_USER, {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: MSP_ID,
                type: 'X.509',
            });
            console.log(`[Admin] ✅ '${ADMIN_USER}' enrolled thành công!`);
        } catch (err) {
            console.error(`[Admin] ❌ Enroll thất bại: ${err.message}`);
            process.exit(1);
        }
    }

    // ─── REGISTER + ENROLL APP USER ──────────────────────────────────────────
    const appUserExists = await wallet.get(APP_USER);
    if (appUserExists) {
        console.log(`\n[AppUser] '${APP_USER}' đã có trong wallet.`);
    } else {
        console.log(`\n[AppUser] Đang xử lý '${APP_USER}'...`);
        try {
            const adminIdentity = await wallet.get(ADMIN_USER);
            if (!adminIdentity) throw new Error(`Không tìm thấy admin trong wallet`);

            const adminProvider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
            const adminUser = await adminProvider.getUserContext(adminIdentity, ADMIN_USER);

            // Register (handle cả trường hợp đã registered)
            let enrollSecret;
            try {
                enrollSecret = await ca.register(
                    {
                        affiliation: 'org1.department1',
                        enrollmentID: APP_USER,
                        role: 'client',
                        attrs: [{ name: 'role', value: 'appUser', ecert: true }],
                    },
                    adminUser,
                );
                console.log(`[AppUser] Registered thành công`);
            } catch (regErr) {
                if (regErr.message && regErr.message.includes('already registered')) {
                    // Đã registered → reset secret qua IdentityService
                    console.log(`[AppUser] Đã registered, đang reset secret...`);
                    const NEW_SECRET = 'appUserReset1';
                    const identityService = ca.newIdentityService();
                    let updateResult;
                    try {
                        updateResult = await identityService.update(
                            APP_USER,
                            {
                                enrollmentSecret: NEW_SECRET,
                                type: 'client',
                                affiliation: 'org1.department1',
                                maxEnrollments: -1,
                            },
                            adminUser,
                        );
                    } catch (updateErr) {
                        console.error(`[AppUser] identityService.update failed: ${updateErr.message}`);
                        throw updateErr;
                    }
                    // Dùng secret từ response nếu có, fallback NEW_SECRET
                    enrollSecret = (updateResult && updateResult.secret) ? updateResult.secret : NEW_SECRET;
                    console.log(`[AppUser] Reset secret thành công, sử dụng secret: '${enrollSecret}'`);
                } else {
                    throw regErr;
                }
            }

            // Enroll với secret vừa lấy
            const enrollment = await ca.enroll({
                enrollmentID: APP_USER,
                enrollmentSecret: enrollSecret,
            });

            await wallet.put(APP_USER, {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: MSP_ID,
                type: 'X.509',
            });
            console.log(`[AppUser] ✅ '${APP_USER}' enrolled thành công!`);
        } catch (err) {
            console.error(`[AppUser] ❌ Thất bại: ${err.message}`);
            process.exit(1);
        }
    }

    // ─── SUMMARY ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────');
    console.log('✅ Wallet setup hoàn tất!\n');
    console.log('Các identity trong wallet:');
    for (const id of await wallet.list()) {
        console.log(`   ✓ ${id}`);
    }
    console.log('\nBước tiếp theo:');
    console.log('  npm run start:dev   (Windows terminal)');
    console.log('─────────────────────────────────────────');
}

main().catch((err) => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});
