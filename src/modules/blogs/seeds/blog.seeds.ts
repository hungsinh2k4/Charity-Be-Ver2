import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../schemas/blog.schema';

const MOCK_BLOGS = [
  {
    title: 'Cách Blockchain đang thay đổi hoạt động từ thiện tại Việt Nam',
    excerpt: 'Khám phá cách công nghệ Hyperledger Fabric mang đến sự minh bạch chưa từng có cho hoạt động quyên góp từ thiện và xây dựng lại niềm tin trong lĩnh vực phi lợi nhuận.',
    author: 'Nguyễn Văn An',
    date: '28/11/2024',
    // Ảnh mô tả công nghệ blockchain/kỹ thuật số hiện đại
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1080&auto=format&fit=crop',
    category: 'Công nghệ',
    content: `Lĩnh vực từ thiện tại Việt Nam đã từ lâu phải đối mặt với các vấn đề về niềm tin của công chúng...`,
  },
  {
    title: 'Sự trỗi dậy của việc quyên góp kỹ thuật số tại Đông Nam Á',
    excerpt: 'Cách các nền tảng thanh toán kỹ thuật số đang giúp mọi người trên khắp Đông Nam Á dễ dàng hơn trong việc hỗ trợ các hoạt động mà họ quan tâm.',
    author: 'Trần Thị Bình',
    date: '15/12/2024',
    // Ảnh người sử dụng smartphone thanh toán (phổ biến ở VN)
    image: 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=1080&auto=format&fit=crop',
    category: 'Xu hướng',
    content: `Đông Nam Á đã chứng kiến sự chuyển đổi đáng kể trong cách mọi người quyên góp...`,
  },
  {
    title: 'Tính minh bạch trong các tổ chức phi lợi nhuận',
    excerpt: 'Tại sao tính minh bạch lại quan trọng hơn bao giờ hết đối với các tổ chức phi lợi nhuận đang tìm kiếm niềm tin của công chúng và duy trì quyên góp.',
    author: 'Lê Minh Cường',
    date: '02/01/2025',
    // Ảnh biểu đồ, dữ liệu tài chính minh bạch
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1080&auto=format&fit=crop',
    category: 'Chiến lược',
    content: `Tính minh bạch đã trở thành nền tảng của các tổ chức phi lợi nhuận thành công...`,
  },
  {
    title: 'Hợp đồng thông minh tự động hóa phân phối từ thiện',
    excerpt: 'Khám phá cách hợp đồng thông minh có thể đảm bảo quỹ quyên góp đến đúng người thụ hưởng dự định mà không có trung gian.',
    author: 'Phạm Hoàng Duy',
    date: '18/01/2025',
    // Ảnh code/kết nối mạng lưới dữ liệu
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1080&auto=format&fit=crop',
    category: 'Công nghệ',
    content: `Hợp đồng thông minh đại diện cho một trong những ứng dụng đầy hứa hẹn nhất...`,
  },
  {
    title: 'Từ thiện do cộng đồng dẫn dắt tại Việt Nam',
    excerpt: 'Cách các phong trào cơ sở đang thay đổi cách người Việt Nam nghĩ về việc trao lại cho cộng đồng của họ.',
    author: 'Nguyễn Thu Hà',
    date: '25/01/2025',
    // Ảnh nhóm tình nguyện viên nắm tay hoặc làm việc cùng nhau
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?q=80&w=1080&auto=format&fit=crop',
    category: 'Cộng đồng',
    content: `Một cuộc cách mạng lặng lẽ đang diễn ra trong hoạt động từ thiện của Việt Nam...`,
  },
  {
    title: 'Tác động của việc theo dõi quyên góp theo thời gian thực',
    excerpt: 'Cách các hệ thống theo dõi theo thời gian thực đang tăng niềm tin và sự tham gia của nhà tài trợ trong các chiến dịch từ thiện.',
    author: 'Đặng Xuân Hùng',
    date: '05/02/2025',
    // Ảnh đồng hồ hoặc dữ liệu realtime trên màn hình
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1080&auto=format&fit=crop',
    category: 'Chiến lược',
    content: `Việc theo dõi quyên góp theo thời gian thực đã thay đổi căn bản mối quan hệ...`,
  },
  {
    title: 'Kiểm toán Blockchain cho các tổ chức từ thiện',
    excerpt: 'Tìm hiểu sâu về cách kiểm toán blockchain hoạt động và tại sao nó lại quan trọng đối với trách nhiệm giải trình trong lĩnh vực phi lợi nhuận.',
    author: 'Vũ Thị Mai Anh',
    date: '12/02/2025',
    // Ảnh khối (block) hoặc bảo mật dữ liệu
    image: 'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?q=80&w=1080&auto=format&fit=crop',
    category: 'Công nghệ',
    content: `Kiểm toán blockchain đại diện cho một sự thay đổi mô hình...`,
  },
  {
    title: 'Xây dựng niềm tin trong các tổ chức từ thiện',
    excerpt: 'Các chiến lược chính để các tổ chức phi lợi nhuận xây dựng và duy trì niềm tin của công chúng trong thời đại kỹ thuật số.',
    author: 'Bùi Quang Đạt',
    date: '20/02/2025',
    // Ảnh cái bắt tay biểu tượng cho sự tin tưởng
    image: 'https://images.unsplash.com/photo-1521791136364-798a7bc0d262?q=80&w=1080&auto=format&fit=crop',
    category: 'Chiến lược',
    content: `Niềm tin là đồng tiền của hoạt động từ thiện...`,
  },
  {
    title: 'Tương lai của huy động vốn từ cộng đồng tại Việt Nam',
    excerpt: 'Xu hướng và dự đoán cho tương lai của việc huy động vốn từ cộng đồng như một công cụ cho điều tốt đẹp xã hội tại Việt Nam.',
    author: 'Hoàng Minh Đức',
    date: '28/02/2025',
    // Ảnh một đám đông hoặc nhóm người (crowdfunding)
    image: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?q=80&w=1080&auto=format&fit=crop',
    category: 'Xu hướng',
    content: `Việc huy động vốn từ cộng đồng đã thay đổi cách các cá nhân...`,
  },
  {
    title: 'Phân tích dữ liệu cải thiện hiệu quả chiến dịch',
    excerpt: 'Sử dụng phân tích dữ liệu để tối ưu hóa các chiến dịch từ thiện và tối đa hóa tác động cho các tổ chức thụ hưởng.',
    author: 'Trương Minh Tuấn',
    date: '08/03/2025',
    // Ảnh biểu đồ tăng trưởng
    image: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?q=80&w=1080&auto=format&fit=crop',
    category: 'Chiến lược',
    content: `Phân tích dữ liệu đã trở thành công cụ không thể thiếu...`,
  },
  {
    title: 'Quản lý tình nguyện viên trong kỷ nguyên kỹ thuật số',
    excerpt: 'Cách các công cụ kỹ thuật số đang chuyển đổi cách các tổ chức tuyển dụng, đào tạo và quản lý tình nguyện viên.',
    author: 'Đỗ Thị Lan',
    date: '15/03/2025',
    // Ảnh nhóm bạn trẻ làm việc nhóm năng động
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1080&auto=format&fit=crop',
    category: 'Cộng đồng',
    content: `Tình nguyện viên là nguồn sống của nhiều tổ chức từ thiện...`,
  },
  {
    title: 'Xử lý thanh toán an toàn cho các tổ chức phi lợi nhuận',
    excerpt: 'Các phương pháp hay nhất để triển khai các giải pháp thanh toán an toàn xây dựng niềm tin của nhà tài trợ và đơn giản hóa giao dịch.',
    author: 'Lý Quốc Trung',
    date: '22/03/2025',
    // Ảnh thẻ tín dụng/bảo mật thanh toán
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1080&auto=format&fit=crop',
    category: 'Công nghệ',
    content: `Xử lý thanh toán an toàn không còn là tùy chọn...`,
  },
  {
    title: 'Đo lường tác động xã hội trong công việc từ thiện',
    excerpt: 'Các khung và phương pháp để đo lường và báo cáo chính xác tác động xã hội của các sáng kiến từ thiện.',
    author: 'Ngô Thị Phương',
    date: '29/03/2025',
    // Ảnh một mầm cây lớn lên (biểu tượng tác động)
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1080&auto=format&fit=crop',
    category: 'Chiến lược',
    content: `Đo lường tác động xã hội là điều thiêng liêng...`,
  },
  {
    title: 'Quyên góp di động: Tiếp cận nhà tài trợ khi đang di chuyển',
    excerpt: 'Cách các nền tảng quyên góp được tối ưu hóa cho thiết bị di động đang giúp nhà tài trợ dễ dàng đóng góp từ bất kỳ đâu.',
    author: 'Phan Thanh Sơn',
    date: '05/04/2025',
    // Ảnh người cầm điện thoại ngoài trời
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1080&auto=format&fit=crop',
    category: 'Xu hướng',
    content: `Quyên góp di động đã phát triển từ một tính năng mới...`,
  },
  {
    title: 'Vai trò của trí tuệ nhân tạo trong viện trợ nhân đạo',
    excerpt: 'Cách trí tuệ nhân tạo đang được sử dụng để cải thiện hiệu quả và hiệu suất của các nỗ lực viện trợ nhân đạo.',
    author: 'Trịnh Đình Nam',
    date: '12/04/2025',
    // Ảnh AI/Mạch điện não bộ
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1080&auto=format&fit=crop',
    category: 'Công nghệ',
    content: `Trí tuệ nhân tạo đang mở ra những biên giới mới...`,
  },
  {
    title: 'Các chương trình trách nhiệm xã hội doanh nghiệp hiệu quả',
    excerpt: 'Các ví dụ về các chương trình CSR hiệu quả tạo ra tác động có ý nghĩa đồng thời mang lại lợi ích cho cả doanh nghiệp và cộng đồng.',
    author: 'Cao Thị Hương',
    date: '19/04/2025',
    // Ảnh tòa nhà văn phòng hiện đại
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1080&auto=format&fit=crop',
    category: 'Chiến lược',
    content: `Trách nhiệm xã hội doanh nghiệp đã trưởng thành...`,
  },
  {
    title: 'Ứng phó thiên tai: Công nghệ cứu sống',
    excerpt: 'Cách công nghệ hiện đại đang cải thiện việc điều phối ứng phó thiên tai và các nỗ lực cứu trợ nhân đạo.',
    author: 'Đinh Quang Khải',
    date: '26/04/2025',
    // Ảnh cứu hộ hoặc môi trường khắc nghiệt
    image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1080&auto=format&fit=crop',
    category: 'Cộng đồng',
    content: `Thiên tai tấn công Việt Nam với nhịp độ đáng lo ngại...`,
  },
  {
    title: 'Thu hút thế hệ Gen Z tham gia hoạt động từ thiện',
    excerpt: 'Tìm hiểu những gì thúc đẩy thế hệ Gen Z quyên góp và cách các tổ chứi có thể thu hút nhóm demography này tốt hơn.',
    author: 'Hà Đức Trí',
    date: '03/05/2025',
    // Ảnh một nhóm Gen Z sử dụng công nghệ
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1080&auto=format&fit=crop',
    category: 'Xu hướng',
    content: `Thế hệ Gen Z — những người sinh ra trong khoảng từ 1997 đến 2012...`,
  },
  {
    title: 'Kinh tế học của việc quyên góp từ thiện',
    excerpt: 'Tìm hiểu các yếu tố kinh tế ảnh hưởng đến hành vi quyên góp từ thiện và cách tận dụng chúng.',
    author: 'Chu Thị Bông',
    date: '10/05/2025',
    // Ảnh tiền xu hoặc biểu đồ kinh tế
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=1080&auto=format&fit=crop',
    category: 'Chiến lược',
    content: `Quyên góp từ thiện không phải là thuần túy vị tha...`,
  },
  {
    title: 'Mở rộng tác động thông qua quan hệ đối tác chiến lược',
    excerpt: 'Cách các tổ chức phi lợi nhuận có thể mở rộng tác động của họ bằng cách xây dựng các quan hệ đối tác chiến lược với doanh nghiệp và các tổ chức phi lợi nhuận khác.',
    author: 'Nguyễn Thanh Hùng',
    date: '17/05/2025',
    // Ảnh hai người đang thảo luận công việc (đối tác)
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1080&auto=format&fit=crop',
    category: 'Chiến lược',
    content: `Không một tổ chức phi lợi nhuận nào có thể giải quyết các vấn đề xã hội...`,
  },
];

@Injectable()
export class BlogSeeds implements OnModuleInit {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
  ) { }

  async onModuleInit() {
    const count = await this.blogModel.countDocuments({ isDeleted: false });
    if (count === 0) {
      await this.blogModel.insertMany(MOCK_BLOGS);
      console.log(`Seeded ${MOCK_BLOGS.length} blog posts`);
    }
  }
}