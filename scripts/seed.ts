import { MongoClient, ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/charity-db';

interface UserDoc {
    _id: ObjectId;
    email: string;
    passwordHash: string;
    name: string;
    role: 'USER' | 'MODERATOR' | 'ADMIN' | 'AUDITOR';
    verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    verifiedAt?: Date;
    identityDocument?: string;
    selfieWithDocument?: string;
    verificationNote?: string;
    phone?: string;
    address?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface OrganizationDoc {
    _id: ObjectId;
    blockchainId?: string;
    userId: ObjectId;
    name: string;
    description?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    legalDocuments: string[];
    verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface CampaignDoc {
    _id: ObjectId;
    blockchainId?: string;
    title: string;
    description: string;
    summary?: string;
    coverImage?: string;
    goalAmount: number;
    currentAmount: number;
    currency: string;
    organizationId: ObjectId;
    creatorId: ObjectId;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
    isDeleted: boolean;
    category?: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface DonationDoc {
    _id: ObjectId;
    blockchainTxId: string;
    campaignId: ObjectId;
    organizationId: ObjectId;
    amount: number;
    currency: string;
    donorEmail?: string;
    donorName: string;
    isAnonymous: boolean;
    message?: string;
    paymentMethod?: string;
    paymentReference?: string;
    subscribeToUpdates: boolean;
    createdAt: Date;
}

interface VerificationRequestDoc {
    _id: ObjectId;
    entityType: 'USER' | 'ORGANIZATION' | 'CAMPAIGN';
    entityId: ObjectId;
    requesterId: ObjectId;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    documents: string[];
    notes?: string;
    reviewedBy?: ObjectId;
    reviewNotes?: string;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

async function seed() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await db.collection('users').deleteMany({});
        await db.collection('organizations').deleteMany({});
        await db.collection('campaigns').deleteMany({});
        await db.collection('donations').deleteMany({});
        await db.collection('verificationrequests').deleteMany({});

        const now = new Date();
        const passwordHash = await bcrypt.hash('Password123!', 10);

        // ============ USERS ============
        console.log('👥 Creating users...');
        const users: UserDoc[] = [
            {
                _id: new ObjectId(),
                email: 'admin@charity.com',
                passwordHash: await bcrypt.hash('Admin123!', 10),
                name: 'Admin User',
                role: 'ADMIN',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-01-01'),
                phone: '0901234567',
                address: 'Hà Nội, Việt Nam',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            },
            {
                _id: new ObjectId(),
                email: 'auditor@charity.com',
                passwordHash,
                name: 'Nguyễn Văn Kiểm',
                role: 'AUDITOR',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-01-15'),
                phone: '0901234568',
                address: 'TP.HCM, Việt Nam',
                createdAt: new Date('2024-01-15'),
                updatedAt: new Date('2024-01-15'),
            },
            {
                _id: new ObjectId(),
                email: 'org1@helpinghands.org',
                passwordHash,
                name: 'Trần Thị Mai',
                role: 'USER',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-02-01'),
                phone: '0902345678',
                address: 'Đà Nẵng, Việt Nam',
                createdAt: new Date('2024-02-01'),
                updatedAt: new Date('2024-02-01'),
            },
            {
                _id: new ObjectId(),
                email: 'org2@greenfuture.org',
                passwordHash,
                name: 'Lê Văn Hùng',
                role: 'USER',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-02-15'),
                phone: '0903456789',
                address: 'Cần Thơ, Việt Nam',
                createdAt: new Date('2024-02-15'),
                updatedAt: new Date('2024-02-15'),
            },
            {
                _id: new ObjectId(),
                email: 'org3@educationforall.org',
                passwordHash,
                name: 'Phạm Thị Lan',
                role: 'USER',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-03-01'),
                phone: '0904567890',
                address: 'Huế, Việt Nam',
                createdAt: new Date('2024-03-01'),
                updatedAt: new Date('2024-03-01'),
            },
            {
                _id: new ObjectId(),
                email: 'org4@healthhope.org',
                passwordHash,
                name: 'Hoàng Văn Nam',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-hoangvannam.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-hoangvannam.jpg',
                verificationNote: 'Tôi là đại diện pháp lý của Tổ Chức Hy Vọng Sức Khỏe',
                phone: '0905678901',
                address: 'Nha Trang, Việt Nam',
                createdAt: new Date('2024-11-01'),
                updatedAt: new Date('2024-11-01'),
            },
            {
                _id: new ObjectId(),
                email: 'org5@childrensmiles.org',
                passwordHash,
                name: 'Đinh Thị Hương',
                role: 'USER',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-04-01'),
                phone: '0906789012',
                address: 'Vũng Tàu, Việt Nam',
                createdAt: new Date('2024-04-01'),
                updatedAt: new Date('2024-04-01'),
            },
            {
                _id: new ObjectId(),
                email: 'donor1@gmail.com',
                passwordHash,
                name: 'Ngô Văn Đức',
                role: 'USER',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-05-01'),
                phone: '0907890123',
                address: 'Hải Phòng, Việt Nam',
                createdAt: new Date('2024-05-01'),
                updatedAt: new Date('2024-05-01'),
            },
            {
                _id: new ObjectId(),
                email: 'donor2@gmail.com',
                passwordHash,
                name: 'Vũ Thị Thảo',
                role: 'USER',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-06-01'),
                createdAt: new Date('2024-06-01'),
                updatedAt: new Date('2024-06-01'),
            },
            {
                _id: new ObjectId(),
                email: 'pending@example.com',
                passwordHash,
                name: 'Bùi Văn Tài',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-buivantai.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-buivantai.jpg',
                verificationNote: 'Xin được xác minh để quyên góp cho chiến dịch cứu trợ',
                createdAt: new Date('2024-12-01'),
                updatedAt: new Date('2024-12-01'),
            },
            // ============ THÊM 10 USER PENDING VERIFICATION ============
            {
                _id: new ObjectId(),
                email: 'pending1@example.com',
                passwordHash,
                name: 'Nguyễn Thị Hồng',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-nguyen-hong.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-nguyen-hong.jpg',
                verificationNote: 'Tôi muốn tạo chiến dịch từ thiện giúp trẻ em vùng cao',
                phone: '0912111222',
                address: 'Lào Cai, Việt Nam',
                createdAt: new Date('2024-12-10'),
                updatedAt: new Date('2024-12-10'),
            },
            {
                _id: new ObjectId(),
                email: 'pending2@example.com',
                passwordHash,
                name: 'Trần Văn Minh',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-tran-minh.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-tran-minh.jpg',
                verificationNote: 'Xin xác minh để đóng góp cho các tổ chức từ thiện',
                phone: '0912222333',
                address: 'Hà Giang, Việt Nam',
                createdAt: new Date('2024-12-11'),
                updatedAt: new Date('2024-12-11'),
            },
            {
                _id: new ObjectId(),
                email: 'pending3@example.com',
                passwordHash,
                name: 'Lê Thị Mai Anh',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-le-maianh.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-le-maianh.jpg',
                verificationNote: 'Tôi là tình nguyện viên, muốn xác minh để tham gia hoạt động từ thiện',
                phone: '0912333444',
                address: 'Sơn La, Việt Nam',
                createdAt: new Date('2024-12-12'),
                updatedAt: new Date('2024-12-12'),
            },
            {
                _id: new ObjectId(),
                email: 'pending4@example.com',
                passwordHash,
                name: 'Phạm Quốc Hưng',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-pham-hung.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-pham-hung.jpg',
                verificationNote: 'Muốn xác minh để thành lập tổ chức từ thiện mới',
                phone: '0912444555',
                address: 'Điện Biên, Việt Nam',
                createdAt: new Date('2024-12-13'),
                updatedAt: new Date('2024-12-13'),
            },
            {
                _id: new ObjectId(),
                email: 'pending5@example.com',
                passwordHash,
                name: 'Võ Thị Thanh Tâm',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-vo-tam.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-vo-tam.jpg',
                verificationNote: 'Tôi là giáo viên, muốn xác minh để quyên góp sách vở cho học sinh nghèo',
                phone: '0912555666',
                address: 'Yên Bái, Việt Nam',
                createdAt: new Date('2024-12-14'),
                updatedAt: new Date('2024-12-14'),
            },
            {
                _id: new ObjectId(),
                email: 'pending6@example.com',
                passwordHash,
                name: 'Đỗ Văn Thành',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-do-thanh.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-do-thanh.jpg',
                verificationNote: 'Xin xác minh để hỗ trợ các nạn nhân bão lũ',
                phone: '0912666777',
                address: 'Nghệ An, Việt Nam',
                createdAt: new Date('2024-12-15'),
                updatedAt: new Date('2024-12-15'),
            },
            {
                _id: new ObjectId(),
                email: 'pending7@example.com',
                passwordHash,
                name: 'Hoàng Thị Lan',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-hoang-lan.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-hoang-lan.jpg',
                verificationNote: 'Tôi muốn xác minh để đóng góp cho quỹ phẫu thuật tim cho trẻ em',
                phone: '0912777888',
                address: 'Hà Tĩnh, Việt Nam',
                createdAt: new Date('2024-12-16'),
                updatedAt: new Date('2024-12-16'),
            },
            {
                _id: new ObjectId(),
                email: 'pending8@example.com',
                passwordHash,
                name: 'Ngô Quang Vinh',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-ngo-vinh.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-ngo-vinh.jpg',
                verificationNote: 'Doanh nhân muốn xác minh để tài trợ cho các chiến dịch giáo dục',
                phone: '0912888999',
                address: 'Quảng Bình, Việt Nam',
                createdAt: new Date('2024-12-17'),
                updatedAt: new Date('2024-12-17'),
            },
            {
                _id: new ObjectId(),
                email: 'pending9@example.com',
                passwordHash,
                name: 'Trương Thị Bích Ngọc',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-truong-ngoc.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-truong-ngoc.jpg',
                verificationNote: 'Tôi là bác sĩ, muốn tham gia các chiến dịch y tế cộng đồng',
                phone: '0912999000',
                address: 'Quảng Trị, Việt Nam',
                createdAt: new Date('2024-12-18'),
                updatedAt: new Date('2024-12-18'),
            },
            {
                _id: new ObjectId(),
                email: 'pending10@example.com',
                passwordHash,
                name: 'Lý Văn Phước',
                role: 'USER',
                verificationStatus: 'PENDING',
                identityDocument: 'https://storage.example.com/docs/cccd-ly-phuoc.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-ly-phuoc.jpg',
                verificationNote: 'Muốn xác minh để hỗ trợ xây nhà tình thương cho người nghèo',
                phone: '0913000111',
                address: 'Thừa Thiên Huế, Việt Nam',
                createdAt: new Date('2024-12-19'),
                updatedAt: new Date('2024-12-19'),
            },
            {
                _id: new ObjectId(),
                email: 'moderator@charity.com',
                passwordHash,
                name: 'Moderator User',
                role: 'MODERATOR',
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date('2024-01-20'),
                phone: '0901234569',
                address: 'Ha Noi, Viet Nam',
                createdAt: new Date('2024-01-20'),
                updatedAt: new Date('2024-01-20'),
            },
            {
                _id: new ObjectId(),
                email: 'user.unverified@charity.com',
                passwordHash,
                name: 'Unverified User',
                role: 'USER',
                verificationStatus: 'UNVERIFIED',
                phone: '0901111222',
                address: 'Ha Noi, Viet Nam',
                createdAt: new Date('2024-12-20'),
                updatedAt: new Date('2024-12-20'),
            },
            {
                _id: new ObjectId(),
                email: 'user.rejected@charity.com',
                passwordHash,
                name: 'Rejected User',
                role: 'USER',
                verificationStatus: 'REJECTED',
                identityDocument: 'https://storage.example.com/docs/cccd-rejected-user.jpg',
                selfieWithDocument: 'https://storage.example.com/docs/selfie-rejected-user.jpg',
                verificationNote: 'Ho so bi tu choi de test UI nop lai xac minh',
                phone: '0901111333',
                address: 'TP.HCM, Viet Nam',
                createdAt: new Date('2024-12-21'),
                updatedAt: new Date('2024-12-21'),
            },
        ];

        await db.collection('users').insertMany(users);
        console.log(`✅ Created ${users.length} users`);

        // ============ ORGANIZATIONS ============
        console.log('🏢 Creating organizations...');
        const organizations: OrganizationDoc[] = [
            {
                _id: new ObjectId(),
                blockchainId: `BC-ORG-${uuidv4().substring(0, 8)}`,
                userId: users[2]._id,
                name: 'Quỹ Từ Thiện Vòng Tay Nhân Ái',
                description: 'Tận tâm cải thiện cuộc sống thông qua các sáng kiến giáo dục và y tế tại nông thôn Việt Nam.',
                website: 'https://helpinghands.org',
                contactEmail: 'contact@helpinghands.org',
                contactPhone: '0902345678',
                address: '123 Đường Lê Lợi, Đà Nẵng',
                legalDocuments: ['https://storage.example.com/docs/license-001.pdf', 'https://storage.example.com/docs/certificate-001.jpg'],
                verificationStatus: 'VERIFIED',
                isDeleted: false,
                createdAt: new Date('2024-02-01'),
                updatedAt: new Date('2024-02-01'),
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-ORG-${uuidv4().substring(0, 8)}`,
                userId: users[3]._id,
                name: 'Việt Nam Xanh Tương Lai',
                description: 'Tổ chức bảo tồn môi trường và phát triển bền vững.',
                website: 'https://greenfuture.org',
                contactEmail: 'info@greenfuture.org',
                contactPhone: '0903456789',
                address: '456 Đường Trần Hưng Đạo, Cần Thơ',
                legalDocuments: ['https://storage.example.com/docs/license-002.pdf'],
                verificationStatus: 'VERIFIED',
                isDeleted: false,
                createdAt: new Date('2024-02-15'),
                updatedAt: new Date('2024-02-15'),
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-ORG-${uuidv4().substring(0, 8)}`,
                userId: users[4]._id,
                name: 'Giáo Dục Cho Mọi Người',
                description: 'Cung cấp nền giáo dục chất lượng cho trẻ em nghèo trên khắp Việt Nam.',
                website: 'https://educationforall.org',
                contactEmail: 'hello@educationforall.org',
                contactPhone: '0904567890',
                address: '789 Đường Nguyễn Huệ, Huế',
                legalDocuments: ['https://storage.example.com/docs/license-003.pdf', 'https://storage.example.com/docs/registration-003.pdf'],
                verificationStatus: 'VERIFIED',
                isDeleted: false,
                createdAt: new Date('2024-03-01'),
                updatedAt: new Date('2024-03-01'),
            },
            {
                _id: new ObjectId(),
                userId: users[5]._id,
                name: 'Tổ Chức Hy Vọng Sức Khỏe',
                description: 'Mang dịch vụ chăm sóc sức khỏe đến các cộng đồng vùng sâu vùng xa và khó khăn.',
                website: 'https://healthhope.org',
                contactEmail: 'support@healthhope.org',
                contactPhone: '0905678901',
                address: '321 Đường Pasteur, Nha Trang',
                legalDocuments: ['https://storage.example.com/docs/license-004.pdf'],
                verificationStatus: 'PENDING',
                isDeleted: false,
                createdAt: new Date('2024-11-01'),
                updatedAt: new Date('2024-11-01'),
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-ORG-${uuidv4().substring(0, 8)}`,
                userId: users[6]._id,
                name: 'Nụ Cười Trẻ Thơ',
                description: 'Mang lại tuổi thơ vui vẻ cho trẻ mồ côi và trẻ em có hoàn cảnh đặc biệt.',
                website: 'https://childrensmiles.org',
                contactEmail: 'care@childrensmiles.org',
                contactPhone: '0906789012',
                address: '654 Đường Hoàng Diệu, Vũng Tàu',
                legalDocuments: ['https://storage.example.com/docs/license-005.pdf'],
                verificationStatus: 'VERIFIED',
                isDeleted: false,
                createdAt: new Date('2024-04-01'),
                updatedAt: new Date('2024-04-01'),
            },
        ];

        await db.collection('organizations').insertMany(organizations);
        console.log(`✅ Created ${organizations.length} organizations`);

        // ============ CAMPAIGNS ============
        console.log('📢 Creating campaigns...');
        const campaigns: CampaignDoc[] = [
            {
                _id: new ObjectId(),
                blockchainId: `BC-CAMP-${uuidv4().substring(0, 8)}`,
                title: 'Nước Sạch Cho Đồng Bào Vùng Cao',
                description: 'Cung cấp nước sạch cho 5.000 hộ gia đình tại các bản làng vùng sâu vùng xa. Dự án sẽ lắp đặt hệ thống lọc nước và khoan giếng tại những nơi khan hiếm nước sạch.',
                summary: 'Mang nước sạch đến 5.000 hộ gia đình vùng cao',
                coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
                goalAmount: 1250000000,
                currentAmount: 812500000,
                currency: 'VND',
                organizationId: organizations[0]._id,
                creatorId: users[2]._id,
                verificationStatus: 'VERIFIED',
                startDate: new Date('2024-03-01'),
                endDate: new Date('2025-03-01'),
                isActive: true,
                isDeleted: false,
                category: 'Y tế',
                tags: ['nước sạch', 'y tế', 'phát triển nông thôn'],
                createdAt: new Date('2024-03-01'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-CAMP-${uuidv4().substring(0, 8)}`,
                title: 'Trồng Rừng Phủ Xanh Đồi Trọc 2024',
                description: 'Trồng 100.000 cây xanh tại các khu vực rừng bị suy thoái để chống biến đổi khí hậu và khôi phục đa dạng sinh học. Hãy cùng chúng tôi làm cho Việt Nam xanh hơn!',
                summary: 'Trồng 100.000 cây xanh để khôi phục rừng',
                coverImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09',
                goalAmount: 750000000,
                currentAmount: 468750000,
                currency: 'VND',
                organizationId: organizations[1]._id,
                creatorId: users[3]._id,
                verificationStatus: 'VERIFIED',
                startDate: new Date('2024-04-01'),
                endDate: new Date('2025-04-01'),
                isActive: true,
                isDeleted: false,
                category: 'Môi trường',
                tags: ['cây xanh', 'khí hậu', 'trồng rừng'],
                createdAt: new Date('2024-04-01'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-CAMP-${uuidv4().substring(0, 8)}`,
                title: 'Dụng Cụ Học Tập Cho 1.000 Em Nhỏ',
                description: 'Cung cấp đồ dùng học tập thiết yếu, sách vở và dụng cụ cho học sinh nghèo vùng sâu vùng xa. Mỗi em nhỏ đều xứng đáng có đầy đủ dụng cụ để đến trường.',
                summary: 'Hỗ trợ dụng cụ học tập cho 1.000 học sinh',
                coverImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',
                goalAmount: 375000000,
                currentAmount: 305000000,
                currency: 'VND',
                organizationId: organizations[2]._id,
                creatorId: users[4]._id,
                verificationStatus: 'VERIFIED',
                startDate: new Date('2024-05-01'),
                endDate: new Date('2024-12-31'),
                isActive: true,
                isDeleted: false,
                category: 'Giáo dục',
                tags: ['giáo dục', 'trẻ em', 'đồ dùng học tập'],
                createdAt: new Date('2024-05-01'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-CAMP-${uuidv4().substring(0, 8)}`,
                title: 'Phòng Khám Di Động Vùng Cao',
                description: 'Vận hành phòng khám y tế lưu động để cung cấp dịch vụ chăm sóc sức khỏe miễn phí cho các cộng đồng miền núi xa xôi. Bao gồm khám bệnh, cấp thuốc và giáo dục sức khỏe.',
                summary: 'Khám chữa bệnh miễn phí cho đồng bào vùng cao',
                coverImage: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf',
                goalAmount: 2000000000,
                currentAmount: 1140000000,
                currency: 'VND',
                organizationId: organizations[3]._id,
                creatorId: users[5]._id,
                verificationStatus: 'PENDING',
                startDate: new Date('2024-11-15'),
                endDate: new Date('2025-11-15'),
                isActive: true,
                isDeleted: false,
                category: 'Y tế',
                tags: ['sức khỏe', 'y tế', 'vùng sâu vùng xa'],
                createdAt: new Date('2024-11-15'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-CAMP-${uuidv4().substring(0, 8)}`,
                title: 'Cải Tạo Mái Ấm Tình Thương',
                description: 'Sửa chữa và nâng cấp cơ sở vật chất tại cô nhi viện để mang lại môi trường sống tốt hơn cho 150 em nhỏ. Xây mới khu nhà ở, bếp ăn và sân chơi.',
                summary: 'Xây dựng mái ấm tốt hơn cho 150 trẻ mồ côi',
                coverImage: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c',
                goalAmount: 1500000000,
                currentAmount: 210000000,
                currency: 'VND',
                organizationId: organizations[4]._id,
                creatorId: users[6]._id,
                verificationStatus: 'VERIFIED',
                startDate: new Date('2024-06-01'),
                endDate: new Date('2025-06-01'),
                isActive: true,
                isDeleted: false,
                category: 'Trẻ em',
                tags: ['trẻ em', 'trẻ mồ côi', 'nhà ở'],
                createdAt: new Date('2024-06-01'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                title: 'Quỹ Cứu Trợ Khẩn Cấp Miền Trung',
                description: 'Quỹ khẩn cấp để hỗ trợ ngay lập tức cho các cộng đồng bị ảnh hưởng bởi thiên tai, bão lũ tại miền Trung.',
                summary: 'Cứu trợ khẩn cấp cho nạn nhân thiên tai',
                goalAmount: 2500000000,
                currentAmount: 1675000000,
                currency: 'VND',
                organizationId: organizations[0]._id,
                creatorId: users[2]._id,
                verificationStatus: 'VERIFIED',
                startDate: new Date('2024-07-01'),
                isActive: true,
                isDeleted: false,
                category: 'Khẩn cấp',
                tags: ['thiên tai', 'khẩn cấp', 'cứu trợ'],
                createdAt: new Date('2024-07-01'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-CAMP-${uuidv4().substring(0, 8)}`,
                title: 'Phòng Tin Học Cho Trường Làng',
                description: 'Thành lập phòng máy tính tại 10 trường học nông thôn để thu hẹp khoảng cách số và chuẩn bị hành trang cho học sinh bước vào thế giới hiện đại.',
                summary: 'Phổ cập tin học cho học sinh nông thôn',
                coverImage: 'https://images.unsplash.com/photo-1509062522246-3755977927d7',
                goalAmount: 625000000,
                currentAmount: 130000000,
                currency: 'VND',
                organizationId: organizations[2]._id,
                creatorId: users[4]._id,
                verificationStatus: 'VERIFIED',
                startDate: new Date('2024-08-01'),
                endDate: new Date('2025-02-28'),
                isActive: true,
                isDeleted: false,
                category: 'Giáo dục',
                tags: ['công nghệ', 'máy tính', 'kỹ năng số'],
                createdAt: new Date('2024-08-01'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                title: 'Chiến Dịch Làm Sạch Biển',
                description: 'Tổ chức các hoạt động dọn dẹp bãi biển và lắp đặt hệ thống thu gom rác thải để bảo vệ sinh vật biển và môi trường ven biển.',
                summary: 'Bảo vệ đại dương và bãi biển của chúng ta',
                goalAmount: 500000000,
                currentAmount: 52500000,
                currency: 'VND',
                organizationId: organizations[1]._id,
                creatorId: users[3]._id,
                verificationStatus: 'PENDING',
                startDate: new Date('2024-12-01'),
                endDate: new Date('2025-06-30'),
                isActive: true,
                isDeleted: false,
                category: 'Môi trường',
                tags: ['biển đảo', 'dọn rác', 'sinh vật biển'],
                createdAt: new Date('2024-12-01'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                blockchainId: `BC-CAMP-${uuidv4().substring(0, 8)}`,
                title: 'Đào Tạo Nghề Cho Thanh Niên',
                description: 'Cung cấp các khóa đào tạo nghề như may mặc, mộc, điện tử giúp thanh niên có hoàn cảnh khó khăn tìm được việc làm ổn định.',
                summary: 'Đào tạo nghề cho 500 thanh niên',
                coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978',
                goalAmount: 875000000,
                currentAmount: 722500000,
                currency: 'VND',
                organizationId: organizations[2]._id,
                creatorId: users[4]._id,
                verificationStatus: 'VERIFIED',
                startDate: new Date('2024-02-15'),
                endDate: new Date('2025-02-15'),
                isActive: true,
                isDeleted: false,
                category: 'Giáo dục',
                tags: ['dạy nghề', 'việc làm', 'thanh niên'],
                createdAt: new Date('2024-02-15'),
                updatedAt: now,
            },
            {
                _id: new ObjectId(),
                title: 'Hỗ Trợ Sức Khỏe Tâm Thần',
                description: 'Cung cấp dịch vụ tư vấn và hỗ trợ sức khỏe tâm thần cho các cộng đồng khó khăn đang phải đối mặt với căng thẳng và chấn thương tâm lý.',
                summary: 'Hỗ trợ tâm lý cho người cần giúp đỡ',
                goalAmount: 1000000000,
                currentAmount: 0,
                currency: 'VND',
                organizationId: organizations[3]._id,
                creatorId: users[5]._id,
                verificationStatus: 'REJECTED',
                isActive: false,
                isDeleted: false,
                category: 'Y tế',
                tags: ['sức khỏe tâm thần', 'tư vấn', 'tâm lý'],
                createdAt: new Date('2024-10-01'),
                updatedAt: new Date('2024-10-15'),
            },
        ];

        await db.collection('campaigns').insertMany(campaigns);
        console.log(`✅ Created ${campaigns.length} campaigns`);

        // ============ DONATIONS ============
        console.log('💰 Creating donations...');
        const donations: DonationDoc[] = [
            // Donations for Campaign 1 (Clean Water)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[0]._id,
                organizationId: organizations[0]._id,
                amount: 125000000,
                currency: 'VND',
                donorEmail: 'donor1@gmail.com',
                donorName: 'Ngô Văn Đức',
                isAnonymous: false,
                message: 'Nước sạch là quyền cơ bản của con người. Rất vui được đóng góp!',
                paymentMethod: 'Thẻ Tín Dụng',
                paymentReference: 'PAY-001-2024',
                subscribeToUpdates: true,
                createdAt: new Date('2024-03-15'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[0]._id,
                organizationId: organizations[0]._id,
                amount: 250000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Chuyển Khoản',
                subscribeToUpdates: false,
                createdAt: new Date('2024-04-01'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[0]._id,
                organizationId: organizations[0]._id,
                amount: 62500000,
                currency: 'VND',
                donorEmail: 'donor2@gmail.com',
                donorName: 'Vũ Thị Thảo',
                isAnonymous: false,
                message: 'Mỗi giọt nước đều quý giá!',
                paymentMethod: 'Ví Điện Tử',
                subscribeToUpdates: true,
                createdAt: new Date('2024-05-10'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[0]._id,
                organizationId: organizations[0]._id,
                amount: 375000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Tiền Mã Hóa',
                subscribeToUpdates: false,
                createdAt: new Date('2024-11-20'),
            },
            // Donations for Campaign 2 (Reforestation)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[1]._id,
                organizationId: organizations[1]._id,
                amount: 187500000,
                currency: 'VND',
                donorEmail: 'ecofriend@gmail.com',
                donorName: 'Trương Văn Bình',
                isAnonymous: false,
                message: 'Cây xanh là sự sống. Hãy làm cho Việt Nam xanh tươi trở lại!',
                paymentMethod: 'Thẻ Tín Dụng',
                subscribeToUpdates: true,
                createdAt: new Date('2024-04-15'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[1]._id,
                organizationId: organizations[1]._id,
                amount: 31250000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Thanh Toán Qua Điện Thoại',
                subscribeToUpdates: false,
                createdAt: new Date('2024-06-05'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[1]._id,
                organizationId: organizations[1]._id,
                amount: 250000000,
                currency: 'VND',
                donorEmail: 'greencompany@corp.com',
                donorName: 'Công Ty Công Nghệ Xanh',
                isAnonymous: false,
                message: 'Trách nhiệm xã hội của doanh nghiệp.',
                paymentMethod: 'Chuyển Khoản',
                paymentReference: 'CORP-GREEN-2024',
                subscribeToUpdates: true,
                createdAt: new Date('2024-08-10'),
            },
            // Donations for Campaign 3 (School Supplies)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[2]._id,
                organizationId: organizations[2]._id,
                amount: 75000000,
                currency: 'VND',
                donorEmail: 'teacher@school.edu',
                donorName: 'Mai Thị Hoa',
                isAnonymous: false,
                message: 'Là một giáo viên, tôi hiểu dụng cụ học tập quan trọng thế nào.',
                paymentMethod: 'Thẻ Tín Dụng',
                subscribeToUpdates: true,
                createdAt: new Date('2024-05-20'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[2]._id,
                organizationId: organizations[2]._id,
                amount: 125000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                message: 'Giáo dục là chìa khóa của tương lai.',
                paymentMethod: 'Chuyển Khoản',
                subscribeToUpdates: false,
                createdAt: new Date('2024-07-12'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[2]._id,
                organizationId: organizations[2]._id,
                amount: 105000000,
                currency: 'VND',
                donorEmail: 'parentgroup@gmail.com',
                donorName: 'Hội Phụ Huynh',
                isAnonymous: false,
                paymentMethod: 'Ví Điện Tử',
                subscribeToUpdates: true,
                createdAt: new Date('2024-09-30'),
            },
            // Donations for Campaign 4 (Mobile Medical Clinic)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[3]._id,
                organizationId: organizations[3]._id,
                amount: 500000000,
                currency: 'VND',
                donorEmail: 'healthfoundation@org.com',
                donorName: 'Quỹ Y Tế Toàn Cầu',
                isAnonymous: false,
                message: 'Chăm sóc sức khỏe cần đến được với mọi người, mọi nơi.',
                paymentMethod: 'Chuyển Tiền Quốc Tế',
                paymentReference: 'GHF-2024-VN',
                subscribeToUpdates: true,
                createdAt: new Date('2024-11-20'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[3]._id,
                organizationId: organizations[3]._id,
                amount: 390000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Tiền Mã Hóa',
                subscribeToUpdates: false,
                createdAt: new Date('2024-12-01'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[3]._id,
                organizationId: organizations[3]._id,
                amount: 250000000,
                currency: 'VND',
                donorEmail: 'doctor@hospital.vn',
                donorName: 'Bs. Nguyễn Thanh',
                isAnonymous: false,
                message: 'Là bác sĩ, tôi ủng hộ việc đưa y tế đến những người cần giúp đỡ.',
                paymentMethod: 'Thẻ Tín Dụng',
                subscribeToUpdates: true,
                createdAt: new Date('2024-12-10'),
            },
            // Donations for Campaign 5 (Orphanage Renovation)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[4]._id,
                organizationId: organizations[4]._id,
                amount: 125000000,
                currency: 'VND',
                donorEmail: 'caring@heart.com',
                donorName: 'Lý Thị Kim',
                isAnonymous: false,
                message: 'Mỗi đứa trẻ đều xứng đáng có một mái ấm an tòa và hạnh phúc.',
                paymentMethod: 'Thẻ Tín Dụng',
                subscribeToUpdates: true,
                createdAt: new Date('2024-06-15'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[4]._id,
                organizationId: organizations[4]._id,
                amount: 85000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Thanh Toán Qua Điện Thoại',
                subscribeToUpdates: false,
                createdAt: new Date('2024-08-20'),
            },
            // Donations for Campaign 6 (Disaster Relief)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[5]._id,
                organizationId: organizations[0]._id,
                amount: 625000000,
                currency: 'VND',
                donorEmail: 'relief@international.org',
                donorName: 'Tổ Chức Cứu Trợ Quốc Tế',
                isAnonymous: false,
                message: 'Phản ứng nhanh hỗ trợ những người bị ảnh hưởng bởi thiên tai.',
                paymentMethod: 'Chuyển Tiền Quốc Tế',
                subscribeToUpdates: true,
                createdAt: new Date('2024-07-05'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[5]._id,
                organizationId: organizations[0]._id,
                amount: 1050000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Tiền Mã Hóa',
                subscribeToUpdates: false,
                createdAt: new Date('2024-09-15'),
            },
            // Donations for Campaign 7 (Computer Lab)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[6]._id,
                organizationId: organizations[2]._id,
                amount: 75000000,
                currency: 'VND',
                donorEmail: 'tech@company.com',
                donorName: 'Công Ty Công Nghệ Đổi Mới',
                isAnonymous: false,
                message: 'Thu hẹp khoảng cách số từng trường học một.',
                paymentMethod: 'Chuyển Khoản',
                subscribeToUpdates: true,
                createdAt: new Date('2024-08-25'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[6]._id,
                organizationId: organizations[2]._id,
                amount: 55000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Ví Điện Tử',
                subscribeToUpdates: false,
                createdAt: new Date('2024-10-10'),
            },
            // Donations for Campaign 8 (Ocean Cleanup)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[7]._id,
                organizationId: organizations[1]._id,
                amount: 37500000,
                currency: 'VND',
                donorEmail: 'ocean@lover.com',
                donorName: 'Đặng Văn Hải',
                isAnonymous: false,
                message: 'Cứu lấy đại dương!',
                paymentMethod: 'Thẻ Tín Dụng',
                subscribeToUpdates: true,
                createdAt: new Date('2024-12-05'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[7]._id,
                organizationId: organizations[1]._id,
                amount: 15000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Thanh Toán Qua Điện Thoại',
                subscribeToUpdates: false,
                createdAt: new Date('2024-12-12'),
            },
            // Donations for Campaign 9 (Vocational Training)
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[8]._id,
                organizationId: organizations[2]._id,
                amount: 300000000,
                currency: 'VND',
                donorEmail: 'skills@development.org',
                donorName: 'Quỹ Phát Triển Kỹ Năng',
                isAnonymous: false,
                message: 'Trao quyền cho thanh niên bằng các kỹ năng thực tế.',
                paymentMethod: 'Chuyển Tiền Quốc Tế',
                subscribeToUpdates: true,
                createdAt: new Date('2024-03-01'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[8]._id,
                organizationId: organizations[2]._id,
                amount: 200000000,
                currency: 'VND',
                donorName: 'Ẩn danh',
                isAnonymous: true,
                paymentMethod: 'Chuyển Khoản',
                subscribeToUpdates: false,
                createdAt: new Date('2024-05-20'),
            },
            {
                _id: new ObjectId(),
                blockchainTxId: `0x${uuidv4().replace(/-/g, '')}`,
                campaignId: campaigns[8]._id,
                organizationId: organizations[2]._id,
                amount: 222500000,
                currency: 'VND',
                donorEmail: 'employer@company.vn',
                donorName: 'Doanh Nghiệp Việt Nam',
                isAnonymous: false,
                message: 'Đầu tư vào lực lượng lao động tương lai.',
                paymentMethod: 'Thẻ Tín Dụng',
                subscribeToUpdates: true,
                createdAt: new Date('2024-09-10'),
            },
        ];

        await db.collection('donations').insertMany(donations);
        console.log(`✅ Created ${donations.length} donations`);

        // ============ VERIFICATION REQUESTS ============
        console.log('✅ Creating verification requests...');
        const verificationRequests: VerificationRequestDoc[] = [
            {
                _id: new ObjectId(),
                entityType: 'USER',
                entityId: users[9]._id, // pending user
                requesterId: users[9]._id,
                status: 'PENDING',
                documents: ['https://example.com/id-card.jpg', 'https://example.com/proof-of-address.pdf'],
                notes: 'Yêu cầu xác minh để bắt đầu quyên góp.',
                createdAt: new Date('2024-12-01'),
                updatedAt: new Date('2024-12-01'),
            },
            {
                _id: new ObjectId(),
                entityType: 'USER',
                entityId: users[7]._id,
                requesterId: users[7]._id,
                status: 'APPROVED',
                documents: ['https://example.com/verified-id.jpg'],
                notes: 'Yêu cầu xác minh cho tài khoản nhà hảo tâm.',
                reviewedBy: users[20]._id, // reviewed by moderator
                reviewNotes: 'Tất cả tài liệu đã được xác minh. Chấp thuận.',
                reviewedAt: new Date('2024-05-02'),
                createdAt: new Date('2024-05-01'),
                updatedAt: new Date('2024-05-02'),
            },
            {
                _id: new ObjectId(),
                entityType: 'ORGANIZATION',
                entityId: organizations[3]._id, // Health Hope (PENDING)
                requesterId: users[5]._id,
                status: 'PENDING',
                documents: [
                    'https://example.com/healthhope-license.pdf',
                    'https://example.com/healthhope-legal-representative.pdf'
                ],
                notes: 'Yeu cau xac minh to chuc de co the quan ly chien dich gay quy.',
                createdAt: new Date('2024-11-02'),
                updatedAt: new Date('2024-11-02'),
            },
            {
                _id: new ObjectId(),
                entityType: 'ORGANIZATION',
                entityId: organizations[0]._id, // Helping Hands (VERIFIED)
                requesterId: users[2]._id,
                status: 'APPROVED',
                documents: [
                    'https://example.com/helpinghands-license.pdf',
                    'https://example.com/helpinghands-tax-code.pdf'
                ],
                notes: 'Yeu cau xac minh to chuc da duoc phe duyet.',
                reviewedBy: users[20]._id,
                reviewNotes: 'Ho so phap ly hop le. Chap thuan xac minh to chuc.',
                reviewedAt: new Date('2024-02-02'),
                createdAt: new Date('2024-02-01'),
                updatedAt: new Date('2024-02-02'),
            },
            {
                _id: new ObjectId(),
                entityType: 'CAMPAIGN',
                entityId: campaigns[3]._id, // Mobile Medical Clinic (PENDING)
                requesterId: users[5]._id,
                status: 'PENDING',
                documents: [
                    'https://example.com/medical-license.pdf',
                    'https://example.com/project-proposal.pdf',
                    'https://example.com/budget-breakdown.xlsx'
                ],
                notes: 'Yêu cầu xác minh chính thức cho chiến dịch phòng khám y tế lưu động.',
                createdAt: new Date('2024-11-16'),
                updatedAt: new Date('2024-11-16'),
            },
            {
                _id: new ObjectId(),
                entityType: 'CAMPAIGN',
                entityId: campaigns[0]._id, // Clean Water (VERIFIED)
                requesterId: users[2]._id,
                status: 'APPROVED',
                documents: [
                    'https://example.com/water-project-plan.pdf',
                    'https://example.com/partner-agreements.pdf'
                ],
                notes: 'Yêu cầu xác minh cho dự án nước sạch.',
                reviewedBy: users[20]._id, // reviewed by moderator
                reviewNotes: 'Tài liệu xuất sắc. Dự án hợp pháp và có kế hoạch tốt. Chấp thuận.',
                reviewedAt: new Date('2024-03-05'),
                createdAt: new Date('2024-03-02'),
                updatedAt: new Date('2024-03-05'),
            },
            {
                _id: new ObjectId(),
                entityType: 'CAMPAIGN',
                entityId: campaigns[9]._id, // Mental Health (REJECTED)
                requesterId: users[5]._id,
                status: 'REJECTED',
                documents: ['https://example.com/proposal.pdf'],
                notes: 'Yêu cầu xác minh cho chương trình sức khỏe tâm thần.',
                reviewedBy: users[20]._id,
                reviewNotes: 'Thiếu tài liệu về bằng cấp và chứng chỉ. Từ chối.',
                reviewedAt: new Date('2024-10-10'),
                createdAt: new Date('2024-10-05'),
                updatedAt: new Date('2024-10-10'),
            },
            {
                _id: new ObjectId(),
                entityType: 'CAMPAIGN',
                entityId: campaigns[7]._id, // Ocean Cleanup (PENDING)
                requesterId: users[3]._id,
                status: 'PENDING',
                documents: [
                    'https://example.com/cleanup-plan.pdf',
                    'https://example.com/environmental-impact.pdf'
                ],
                notes: 'Xác minh cho sáng kiến làm sạch đại dương.',
                createdAt: new Date('2024-12-02'),
                updatedAt: new Date('2024-12-02'),
            },
        ];

        await db.collection('verificationrequests').insertMany(verificationRequests);
        console.log(`✅ Created ${verificationRequests.length} verification requests`);

        // ============ SUMMARY ============
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('═══════════════════════════════════════════');
        console.log(`📊 Summary:`);
        console.log(`   👥 Users: ${users.length}`);
        console.log(`   🏢 Organizations: ${organizations.length}`);
        console.log(`   📢 Campaigns: ${campaigns.length}`);
        console.log(`   💰 Donations: ${donations.length}`);
        console.log(`   ✅ Verification Requests: ${verificationRequests.length}`);
        console.log('═══════════════════════════════════════════');
        console.log('\n📝 Test Accounts:');
        console.log('   Admin: admin@charity.com / Admin123!');
        console.log('   Moderator: moderator@charity.com / Password123!');
        console.log('   Auditor: auditor@charity.com / Password123!');
        console.log('   Org User: org1@helpinghands.org / Password123!');
        console.log('   Verified User: donor1@gmail.com / Password123!');
        console.log('   Pending User: pending@example.com / Password123!');
        console.log('   Unverified User: user.unverified@charity.com / Password123!');
        console.log('   Rejected User: user.rejected@charity.com / Password123!');
        console.log('═══════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the seed function
seed()
    .then(() => {
        console.log('✅ Seeding script finished');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Seeding script failed:', error);
        process.exit(1);
    });
