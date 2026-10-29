# 🏠 Rent Finder Backend API

Hệ thống Backend chuyên biệt cho nền tảng **Tìm kiếm, Thuê & Quản lý phòng trọ / căn hộ / nhà ở (Rent Finder)**. Dự án được xây dựng trên nền tảng **NestJS**, kiến trúc module hoá (Modular Architecture), kết hợp cơ chế xử lý hàng đợi bất đồng bộ (**BullMQ**), giao tiếp thời gian thực (**Socket.IO**), lưu trữ tệp tin đối tượng (**MinIO / S3**) và tích hợp trí tuệ nhân tạo (**Google Gemini AI**) để tự động kiểm duyệt tin đăng đa phương thức (văn bản & hình ảnh).

---

## 📑 Mục lục
- [1. Công nghệ sử dụng (Tech Stack)](#-1-công-nghệ-sử-dụng-tech-stack)
- [2. Cấu trúc thư mục dự án (Project Structure)](#-2-cấu-trúc-thư-mục-dự-án-project-structure)
- [3. Yêu cầu hệ thống & Cài đặt (Prerequisites & Installation)](#-3-yêu-cầu-hệ-thống--cài-đặt-prerequisites--installation)
- [4. Cấu hình biến môi trường (.env)](#-4-cấu-hình-biến-môi-trường-env)
- [5. Cơ sở dữ liệu & Seeding (Database & Prisma)](#-5-cơ-sở-dữ-liệu--seeding-database--prisma)
- [6. Hướng dẫn khởi chạy (Run & Scripts)](#-6-hướng-dẫn-khởi-chạy-run--scripts)
- [7. Quy trình kiểm duyệt bài đăng bằng AI (Gemini Moderation)](#-7-quy-trình-kiểm-duyệt-bài-đăng-bằng-ai-gemini-moderation)
- [8. Cơ chế Realtime WebSockets (Socket.IO)](#-8-cơ-chế-realtime-websockets-socketio)
- [9. Tài liệu API chi tiết (API Reference)](#-9-tài-liệu-api-chi-tiết-api-reference)
  - [Xác thực & Tài khoản (Auth)](#91-xác-thực--tài-khoản-auth)
  - [Người dùng (Users)](#92-người-dùng-users)
  - [Bài đăng phòng trọ / Bất động sản (Listings)](#93-bài-đăng-phòng-trọ--bất-động-sản-listings)
  - [Quan tâm bài đăng (Listing Interest)](#94-quan-tâm-bài-đăng-listing-interest)
  - [Bảng tin khám phá (Feed)](#95-bảng-tin-khám-phá-feed)
  - [Hợp đồng thuê phòng (Contracts)](#96-hợp-đồng-thuê-phòng-contracts)
  - [Lời mời hợp đồng (Contract Invitations)](#97-lời-mời-hợp-đồng-contract-invitations)
  - [Trò chuyện & Tin nhắn (Conversations & Messages)](#98-trò-chuyện--tin-nhắn-conversations--messages)
  - [Diễn đàn tìm trọ / bạn ở ghép (Forum Posts)](#99-diễn-đàn-tìm-trọ--bạn-ở-ghép-forum-posts)
  - [Địa giới hành chính (Locations)](#910-địa-giới-hành-chính-locations)
  - [Thông báo (Notifications)](#911-thông-báo-notifications)
  - [Quản lý kiểm duyệt AI (AI Moderation)](#912-quản-lý-kiểm-duyệt-ai-ai-moderation)
  - [Lưu trữ tệp tin (Storage)](#913-lưu-trữ-tệp-tin-storage)
- [10. Swagger UI](#-10-swagger-ui)

---

## 🛠 1. Công nghệ sử dụng (Tech Stack)

| Lĩnh vực | Công nghệ / Thư viện | Vai trò |
| :--- | :--- | :--- |
| **Core Framework** | [NestJS v11](https://nestjs.com/) (Node.js platform Express) | Xây dựng kiến trúc backend theo mô hình Controller - Service - Module |
| **Ngôn ngữ** | TypeScript v5.7+ | Tăng cường tính chặt chẽ về mặt kiểu dữ liệu, bảo trì mã nguồn |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM v6](https://www.prisma.io/) | Quản lý quan hệ dữ liệu phức tạp, migration an toàn và truy vấn tối ưu |
| **Authentication** | [Passport.js](http://www.passportjs.org/), JWT (`@nestjs/jwt`), Bcrypt | Xác thực bảo mật với Token JWT, OAuth 2.0 (Google, Facebook), băm mật khẩu |
| **Queue & Worker** | [BullMQ](https://docs.bullmq.io/), Redis (IoRedis) | Xử lý các tác vụ nền bất đồng bộ (Background processing kiểm duyệt tin AI) |
| **AI Moderation** | [Google GenAI SDK](https://github.com/google-gemini/generative-ai-js) (`@google/genai`) | Sử dụng mô hình **Gemini 3.5 Flash / Flash Lite** kiểm duyệt nội dung văn bản và ảnh đa phương thức |
| **Realtime** | [Socket.IO v4](https://socket.io/) (`@nestjs/platform-socket.io`) | Đẩy thông báo tức thời, trạng thái tin đăng, tin nhắn trò chuyện và sự kiện gõ phím |
| **Object Storage** | [AWS SDK S3 v3](https://aws.amazon.com/sdk-for-javascript/), [MinIO](https://min.io/) | Lưu trữ ảnh bài đăng, avatar người dùng, tệp tin đính kèm trong tin nhắn |
| **Image Processing** | [Sharp v0.35](https://sharp.pixelplumbing.com/) | Tối ưu hóa kích thước, xoay hướng ảnh EXIF và nén chuyển đổi định dạng chuẩn WebP |
| **Validation** | `class-validator`, `class-transformer` | Xác thực dữ liệu đầu vào (DTO) tự động thông qua Global ValidationPipe |
| **API Documentation** | [Swagger / OpenAPI](https://swagger.io/) (`@nestjs/swagger`) | Tự động sinh tài liệu API trực quan tại đường dẫn `/api` |
| **Package Manager** | [pnpm](https://pnpm.io/) | Quản lý package nhanh, tiết kiệm dung lượng ổ cứng |

---

## 📂 2. Cấu trúc thư mục dự án (Project Structure)

```text
backend/
├── prisma/
│   ├── data/                 # Dữ liệu JSON danh mục địa giới (Tỉnh, Quận/Huyện, Phường/Xã)
│   ├── migrations/           # Lịch sử các bản migration cơ sở dữ liệu
│   ├── schema.prisma         # Mô hình thực thể Prisma (User, Listing, Contract, Message, v.v.)
│   └── seed-location.ts      # Script nạp dữ liệu Tỉnh/Thành, Quận/Huyện, Phường/Xã Việt Nam
├── src/
│   ├── ai-moderation/        # Module AI kiểm duyệt tin đăng (BullMQ Processor + Gemini SDK)
│   ├── auth/                 # Xác thực tài khoản (JWT, Local, Google OAuth, Facebook OAuth)
│   │   ├── decorators/       # @CurrentUser custom decorator
│   │   ├── dto/              # DTO đăng ký, đăng nhập
│   │   ├── guards/           # JwtAuthGuard, GoogleAuthGuard, FacebookAuthGuard, OptionalJwtAuthGuard
│   │   └── strategies/       # Chiến lược xác thực Passport (JWT, Google, Facebook)
│   ├── contract/             # Quản lý hợp đồng thuê giữa Chủ nhà và Khách thuê
│   ├── contract-invitation/  # Lời mời khách thuê tham gia vào hợp đồng qua SĐT
│   ├── conversation/         # Trò chuyện tin nhắn trực tiếp và tin nhắn nhóm hợp đồng
│   ├── feed/                 # Thuật toán phân phối bài đăng theo vị trí và độ quan tâm
│   ├── forum/                # Diễn đàn cộng đồng đăng tin tìm phòng / tìm bạn cùng phòng
│   ├── listing/              # Quản lý bài đăng cho thuê / bán bất động sản
│   │   ├── dto/              # CreateListingDto, UpdateListingDto, ListingQueryDto
│   │   └── utils/            # Tiện ích tìm kiếm & sắp xếp bài đăng
│   ├── listing-interest/     # Tính năng bày tỏ quan tâm (Interest Score) của người dùng
│   ├── location/             # Tra cứu thông tin Tỉnh/Thành phố, Quận/Huyện, Phường/Xã
│   ├── notification/         # Lưu trữ và gửi thông báo trong ứng dụng
│   ├── prisma/               # Cung cấp PrismaClient và Lifecycle shutdown hook
│   ├── realtime/             # Socket.IO Gateway quản lý phòng và các sự kiện realtime
│   ├── storage/              # Upload tệp tin lên S3/MinIO và xử lý ảnh bằng Sharp
│   ├── user/                 # Quản lý hồ sơ cá nhân người dùng, avatar, số điện thoại
│   ├── app.module.ts         # Root Module tích hợp tất cả các modules và cấu hình BullMQ
│   └── main.ts               # Điểm khởi chạy ứng dụng (Bootstrap, CORS, Pipes, Swagger)
├── .env                      # File cấu hình biến môi trường
├── package.json              # Khai báo dependencies và scripts
├── tsconfig.json             # Cấu hình TypeScript compiler
└── README.md                 # Tài liệu hướng dẫn sử dụng backend
```

---

## ⚙️ 3. Yêu cầu hệ thống & Cài đặt (Prerequisites & Installation)

### Yêu cầu cài đặt sẵn:
- **Node.js**: Phiên bản 18.x trở lên (Khuyến nghị Node.js 20 LTS)
- **pnpm**: Phiên bản 8.x hoặc 9.x (`npm install -g pnpm`)
- **PostgreSQL**: Phiên bản 14 trở lên
- **Redis Server**: Phiên bản 6 trở lên (Phục vụ BullMQ và Pub/Sub)
- **MinIO** hoặc tài khoản lưu trữ đối tượng tương thích S3 (AWS S3, Cloudflare R2, Supabase Storage)

### Các bước cài đặt:

1. **Clone repository và di chuyển vào thư mục backend:**
   ```bash
   cd D:\Homers\rent-finder_backend\backend
   ```

2. **Cài đặt các gói phụ thuộc (Dependencies):**
   ```bash
   pnpm install
   ```

---

## 🔐 4. Cấu hình biến môi trường (.env)

Tạo file `.env` tại thư mục gốc của backend và cấu hình các thông số phù hợp:

```env
# ==========================================
# PORT & APPLICATION
# ==========================================
PORT=3000
FRONTEND_URL=http://localhost:3001

# ==========================================
# DATABASE (PostgreSQL & Prisma)
# ==========================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rent_finder?schema=public"

# ==========================================
# OBJECT STORAGE (MinIO / S3 / R2)
# ==========================================
# Có thể dùng MINIO_* hoặc STORAGE_*
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=12345678
MINIO_BUCKET=rent-finder
MINIO_USE_SSL=false

# Nếu sử dụng URL công khai trực tiếp (Public CDN / MinIO Gateway):
# STORAGE_PUBLIC_URL=http://localhost:9000/rent-finder

# ==========================================
# AUTHENTICATION & SECURITY
# ==========================================
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRATION=7d

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Facebook OAuth Credentials
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback

# ==========================================
# REDIS & QUEUE (BullMQ)
# ==========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
# Hỗ trợ Redis URL hoặc Upstash:
# REDIS_URL=rediss://default:token@your-upstash-url.upstash.io:6379

# ==========================================
# AI MODERATION (Google Gemini API)
# ==========================================
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODERATION_MODEL=gemini-3.5-flash-lite
```

---

## 🗄 5. Cơ sở dữ liệu & Seeding (Database & Prisma)

1. **Khởi tạo và đồng bộ cấu trúc cơ sở dữ liệu (Migrations):**
   ```bash
   pnpm prisma migrate dev --name init
   ```

2. **Tạo lại Prisma Client:**
   ```bash
   pnpm prisma generate
   ```

3. **Nạp dữ liệu mẫu địa giới hành chính (Tỉnh/Thành, Quận/Huyện, Phường/Xã):**
   ```bash
   pnpm prisma db seed
   ```
   *Lệnh này sẽ đọc dữ liệu từ `prisma/data/*.json` và nạp tự động vào các bảng `City`, `District`, `Ward`.*

---

## 🚀 6. Hướng dẫn khởi chạy (Run & Scripts)

| Lệnh | Mô tả |
| :--- | :--- |
| `pnpm start:dev` | Khởi chạy server ở chế độ phát triển (Hot-reload / Watch mode) |
| `pnpm build` | Biên dịch mã nguồn TypeScript sang thư mục `dist/` |
| `pnpm start:prod` | Chạy ứng dụng sản phẩm từ thư mục `dist/` |
| `pnpm test` | Chạy Unit Test với Jest |
| `pnpm test:e2e` | Chạy End-to-End (E2E) Test |
| `pnpm lint` | Kiểm tra và tự động sửa định dạng code theo ESLint |
| `pnpm format` | Định dạng toàn bộ code theo chuẩn Prettier |
| `pnpm prisma studio` | Mở giao diện đồ họa quản trị dữ liệu Prisma Studio |

---

## 🤖 7. Quy trình kiểm duyệt bài đăng bằng AI (Gemini Moderation)

Mỗi bài đăng phòng trọ mới (`POST /listings`) sẽ trải qua một quy trình xử lý nền nghiêm ngặt:

```mermaid
flowchart TD
    A["User tạo bài đăng (POST /listings)"] --> B["Lưu Database: Trạng thái PENDING_REVIEW"]
    B --> C["Đẩy Job vào Queue BullMQ (ai-moderation)"]
    C --> D["Worker lấy Job & gọi Gemini Service"]
    D --> E{"Gemini Multimodal AI phân tích"}
    E -->|Bước 1: Phân tích mục đích| F["Đúng lĩnh vực BĐS/Cho thuê?"]
    F -->|Bước 2: Tiêu đề & Mô tả| G["Nội dung tiêu đề khớp với mô tả?"]
    G -->|Bước 3: Thị giác máy tính| H["Ảnh phòng trọ thật vs Ảnh rác/nhạy cảm?"]
    H -->|Bước 4: Tiêu chuẩn cộng đồng| I["Không chứa ngôn từ cấm, lừa đảo?"]
    I -->|Đạt chuẩn| J["Quyết định: APPROVE<br/>Chuyển sang PUBLISHED"]
    I -->|Vi phạm| K["Quyết định: REJECT<br/>Chuyển sang REJECTED"]
    I -->|Nghi vấn| L["Quyết định: MANUAL_REVIEW"]
    J --> M["Bắn Socket realtime: listing:moderated & feed:new_listing"]
    K --> M
    M --> N["Tạo bản ghi Notification gửi cho Chủ bài đăng"]
```

---

## ⚡ 8. Cơ chế Realtime WebSockets (Socket.IO)

- **Cổng kết nối:** Chung cổng với HTTP Server (mặc định `http://localhost:3000`).
- **Xác thực:** Gửi Bearer JWT Token qua `auth.token`, `headers.authorization`, hoặc `query.token`.
- **Hệ thống Room:**
  - `user:{userId}`: Phòng riêng của từng người dùng để nhận thông báo, tin nhắn mới, kết quả duyệt tin.
  - `conversation:{conversationId}`: Phòng trò chuyện trực tiếp hoặc nhóm hợp đồng.
  - `listing:{listingId}`: Phòng theo dõi biến động của một bài đăng cụ thể.
  - `room:feed`: Kênh broadcast chung cho tất cả người dùng xem bảng tin.

### Các sự kiện từ Client gửi lên (Listen Events):
- `join:conversation`: Tham gia vào phòng chat `{ conversationId: string }`.
- `leave:conversation`: Rời khỏi phòng chat `{ conversationId: string }`.
- `join:listing`: Theo dõi lượt quan tâm bài đăng `{ listingId: string }`.
- `leave:listing`: Hủy theo dõi bài đăng `{ listingId: string }`.
- `typing:start`: Báo hiệu đang soạn tin `{ conversationId: string }`.
- `typing:stop`: Dừng soạn tin `{ conversationId: string }`.

### Các sự kiện Server phát xuống (Emit Events):
| Sự kiện | Phạm vi phát | Mô tả dữ liệu |
| :--- | :--- | :--- |
| `listing:created` | Broadcast | Bài đăng mới được tạo |
| `feed:new_listing` | `room:feed` | Tin đăng đã được AI phê duyệt và lên feed |
| `listing:moderated` | `user:{userId}` | Kết quả duyệt AI (`decision`, `status`, `reasons`) |
| `listing:status_changed`| Broadcast | Trạng thái tin đăng thay đổi |
| `listing:interest_updated` | `user:{ownerId}`, `listing:{id}` | Có người thả tim/quan tâm bài đăng |
| `message:new` | `conversation:{id}`, `user:{id}` | Tin nhắn mới kèm file đính kèm/link bài đăng |
| `conversation:updated` | `user:{id}` | Cập nhật tin nhắn cuối cùng trong danh sách hội thoại |
| `conversation:read` | `conversation:{id}` | Người dùng đã xem tin nhắn |
| `messages:unread_count` | `user:{userId}` | Tổng số cuộc hội thoại chưa đọc |
| `typing:start` / `stop` | `conversation:{id}` | Hiệu ứng đang gõ tin nhắn |
| `notification:new` | `user:{userId}` | Thông báo hệ thống mới (lời mời, quan tâm, duyệt tin) |
| `notification:unread_count`| `user:{userId}` | Số lượng thông báo chưa đọc |

---

## 📡 9. Tài liệu API chi tiết (API Reference)

Tất cả các endpoint yêu cầu xác thực cần gửi kèm Header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

### 9.1. Xác thực & Tài khoản (`/auth`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Đăng ký tài khoản mới bằng Số điện thoại |
| `POST` | `/auth/login` | Public | Đăng nhập bằng Số điện thoại & Mật khẩu |
| `POST` | `/auth/logout` | User | Đăng xuất tài khoản |
| `GET` | `/auth/me` | User | Lấy thông tin tài khoản đang đăng nhập |
| `GET` | `/auth/google` | Public | Đăng nhập thông qua Google OAuth 2.0 |
| `GET` | `/auth/google/callback` | Public | Endpoint callback xử lý đăng nhập Google |
| `GET` | `/auth/facebook` | Public | Đăng nhập thông qua Facebook OAuth |
| `GET` | `/auth/facebook/callback` | Public | Endpoint callback xử lý đăng nhập Facebook |

#### Ví dụ Body đăng ký (`POST /auth/register`):
```json
{
  "phone": "0912345678",
  "password": "Password123@",
  "fullName": "Nguyễn Văn A"
}
```

---

### 9.2. Người dùng (`/users`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | Public | Lấy danh sách người dùng trong hệ thống |
| `GET` | `/users/me` | User | Lấy chi tiết thông tin cá nhân của người dùng hiện tại |
| `PATCH` | `/users/me` | User | Cập nhật hồ sơ cá nhân (`bio`, `avatarUrl`, `cityId`) |
| `POST` | `/users/me/phone` | User | Bổ sung/cập nhật số điện thoại (cho tài khoản OAuth) |
| `POST` | `/users/avatar` | User | Upload ảnh đại diện (`multipart/form-data`, trường `file`) |
| `GET` | `/users/:id` | User | Lấy thông tin hồ sơ của người dùng theo ID |
| `GET` | `/users/:id/listings` | Public | Lấy danh sách các bài đăng của một người dùng |

---

### 9.3. Bài đăng phòng trọ / Bất động sản (`/listings`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/listings` | User | Tạo bài đăng mới (hỗ trợ kèm upload tối đa 20 ảnh qua `files`) |
| `GET` | `/listings` | Public | Tìm kiếm, lọc và phân trang bài đăng theo nhiều tiêu chí |
| `GET` | `/listings/me` | User | Lấy danh sách bài đăng do chính mình tạo |
| `GET` | `/listings/user/:userId` | Public | Lấy danh sách bài đăng theo User ID |
| `GET` | `/listings/:id` | Public | Xem thông tin chi tiết một bài đăng |
| `PATCH` | `/listings/:id` | Owner | Cập nhật thông tin bài đăng |
| `DELETE` | `/listings/:id` | Owner | Xóa bài đăng |
| `POST` | `/listings/:id/images` | Owner | Tải thêm hình ảnh bổ sung cho bài đăng (`files`) |
| `DELETE` | `/listings/:id/images/:imageId` | Owner | Xóa một hình ảnh khỏi bài đăng |

#### Tham số Query tiêu biểu khi tìm kiếm (`GET /listings`):
- `search`: Từ khóa tìm kiếm trong tiêu đề/mô tả
- `cityId`, `districtId`, `wardId`: Lọc theo địa danh
- `listingType`: `ROOM` | `APARTMENT` | `HOUSE` | `OFFICE` | `LAND`
- `saleType`: `RENT` (Cho thuê) | `SALE` (Bán)
- `minPrice`, `maxPrice`, `minRent`, `maxRent`, `minSalePrice`, `maxSalePrice`: Lọc tầm giá
- `minSize`, `maxSize`: Khoảng diện tích ($m^2$)
- `minWc`, `maxWc`, `minBr`, `maxBr`: Số phòng vệ sinh, phòng ngủ
- `amenities[]`: Danh sách tiện ích (`SCHOOL`, `POOL`, `STORE`, `PARK`, `HOSPITAL`, `STATION`, `GYM`, `YARD`, `CAFE`)
- `status`: Trạng thái tin đăng (`PUBLISHED`, `PENDING_REVIEW`, `RENTED`, v.v.)
- `page`, `limit`: Phân trang dữ liệu

---

### 9.4. Quan tâm bài đăng (`Listing Interest`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/listings/:id/interest` | User | Thả tim / Thể hiện sự quan tâm đến bài đăng |
| `DELETE` | `/listings/:id/interest` | User | Hủy bỏ sự quan tâm đối với bài đăng |
| `GET` | `/listings/interested/me` | User | Lấy danh sách tất cả bài đăng mà mình đã thả tim |
| `GET` | `/listings/:id/interests` | Owner | Xem danh sách những người dùng đã quan tâm bài đăng của mình |
| `GET` | `/listings/interests/me` | User | Xem tổng hợp tất cả lượt quan tâm trên toàn bộ bài đăng của mình |

---

### 9.5. Bảng tin khám phá (`/feed`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/feed` | Optional User | Lấy danh sách tin bài trên bảng tin trang chủ, ưu tiên theo tỉnh/thành của người dùng, sắp xếp theo điểm quan tâm (Interest Score) và độ mới |

---

### 9.6. Hợp đồng thuê phòng (`/contracts`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/contracts` | User (Chủ nhà) | Khởi tạo hợp đồng thuê và tự động tạo nhóm chat hợp đồng |
| `GET` | `/contracts` | Public | Lấy danh sách hợp đồng |
| `GET` | `/contracts/me` | User | Lấy danh sách các hợp đồng mình tham gia (chủ nhà hoặc khách thuê) |
| `GET` | `/contracts/my-invitations` | User | Lấy danh sách các lời mời vào hợp đồng gửi đến mình |
| `GET` | `/contracts/:id` | Member | Lấy chi tiết một hợp đồng kèm danh sách người thuê và hội thoại |
| `PATCH` | `/contracts/:id` | Landlord | Cập nhật tên hoặc trạng thái hợp đồng (`ACTIVE`, `TERMINATED`, `EXPIRED`) |
| `POST` | `/contracts/:id/tenants/me/leave` | Tenant | Khách thuê chủ động rời khỏi hợp đồng |
| `GET` | `/contracts/:id/invitations` | Landlord | Xem danh sách các lời mời đã gửi của hợp đồng |

#### Ví dụ Body tạo hợp đồng (`POST /contracts`):
```json
{
  "name": "Hợp đồng thuê Phòng 301 - Tòa nhà SunShine",
  "tenantPhones": ["0987654321", "0912345678"]
}
```

---

### 9.7. Lời mời hợp đồng (`/contracts/invitations`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/contracts/invitations/:contractId` | Landlord | Gửi lời mời người thuê tham gia hợp đồng qua Số điện thoại |
| `POST` | `/contracts/invitations/:id/approve` | Invitee | Chấp thuận tham gia hợp đồng thuê (trở thành thành viên chính thức) |
| `POST` | `/contracts/invitations/:id/reject` | Invitee | Từ chối tham gia hợp đồng |

---

### 9.8. Trò chuyện & Tin nhắn (`/conversations` & `/messages`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/messages/direct` | User | Gửi tin nhắn 1-1 tới người khác (kèm upload file hoặc link bài đăng) |
| `GET` | `/conversations/me` | User | Lấy danh sách các cuộc hội thoại của tôi |
| `GET` | `/conversations/unread-count` | User | Đếm tổng số lượng cuộc trò chuyện có tin nhắn chưa đọc |
| `POST` | `/conversations/read-all` | User | Đánh dấu đã đọc tất cả cuộc trò chuyện |
| `GET` | `/conversations/:id` | Member | Lấy thông tin chi tiết một cuộc trò chuyện |
| `GET` | `/conversations/:id/messages` | Member | Lấy lịch sử tin nhắn trong cuộc trò chuyện |
| `POST` | `/conversations/:id/messages` | Member | Gửi tin nhắn vào cuộc trò chuyện (hỗ trợ upload tệp/ảnh) |
| `POST` | `/conversations/:id/read` | Member | Đánh dấu đã đọc cuộc trò chuyện cụ thể |
| `GET` | `/conversations/:id/members` | Member | Lấy danh sách các thành viên trong cuộc trò chuyện |
| `PATCH` | `/conversations/:id/settings`| Member | Đổi tên cuộc hội thoại |
| `POST` | `/conversations/:id/archive` | Member | Lưu trữ (Archive) hoặc Bỏ lưu trữ cuộc hội thoại |

---

### 9.9. Diễn đàn tìm trọ / bạn ở ghép (`/forum-posts`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/forum-posts` | User | Đăng bài viết tìm phòng hoặc tìm người ở ghép |
| `GET` | `/forum-posts` | Public | Lấy danh sách bài viết diễn đàn (lọc theo khu vực, loại phòng) |
| `GET` | `/forum-posts/:id` | Public | Xem chi tiết bài viết diễn đàn |
| `DELETE` | `/forum-posts/:id` | Author | Xóa bài viết diễn đàn |

#### Ví dụ Body đăng bài diễn đàn (`POST /forum-posts`):
```json
{
  "title": "Tìm nam ở ghép căn hộ 2PN Quận Bình Thạnh",
  "detail": "Phòng rộng 30m2, đã có sẵn tủ lạnh, máy giặt, điều hòa, cần tìm 1 bạn nam gọn gàng, share tiền phòng 2tr5/tháng.",
  "needType": "APARTMENT",
  "needSaleType": "RENT",
  "cityId": "HCM",
  "districtId": "HCM_BINH_THANH"
}
```

---

### 9.10. Địa giới hành chính (`/locations`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/locations/cities` | Public | Lấy toàn bộ danh sách Tỉnh / Thành phố |
| `GET` | `/locations/cities/:cityId/districts` | Public | Lấy danh sách Quận / Huyện trực thuộc Tỉnh/Thành |
| `GET` | `/locations/districts/:districtId/wards` | Public | Lấy danh sách Phường / Xã trực thuộc Quận/Huyện |

---

### 9.11. Thông báo (`/notifications`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | User | Lấy danh sách thông báo của tôi |
| `PATCH` | `/notifications/:id/read` | User | Đánh dấu một thông báo là đã đọc |
| `POST` | `/notifications/read-all` | User | Đánh dấu tất cả thông báo là đã đọc |
| `DELETE` | `/notifications/:id` | User | Xóa một thông báo |

---

### 9.12. Quản lý kiểm duyệt AI (`/moderation`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/moderation/:listingId` | Public | Xem kết quả kiểm duyệt chi tiết của một tin đăng |
| `POST` | `/moderation/:listingId/retry` | User | Đưa tin đăng vào lại hàng đợi kiểm duyệt AI |
| `POST` | `/moderation/:listingId/manual-approve` | Admin/User | Phê duyệt thủ công tin đăng |
| `POST` | `/moderation/:listingId/manual-reject` | Admin/User | Từ chối tin đăng thủ công kèm danh sách lý do |

---

### 9.13. Lưu trữ tệp tin (`/storage`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/storage/health` | Public | Kiểm tra kết nối dịch vụ lưu trữ đối tượng (S3 / MinIO) |

---

## 📖 10. Swagger UI

Dự án đã tích hợp sẵn Swagger UI theo chuẩn OpenAPI. Sau khi chạy server:

👉 Truy cập tài liệu API trực quan tại: **`http://localhost:3000/api`**

Tại đây, bạn có thể xem chi tiết Schema của từng DTO, thử nghiệm gọi trực tiếp các API và kiểm tra response mẫu.

---

## 👨‍💻 Phát triển & Đóng góp (Development)

Mọi đóng góp, báo lỗi hoặc đề xuất tính năng mới vui lòng tạo issue hoặc pull request trên repository. Trước khi commit code, đảm bảo đã chạy kiểm tra linter:
```bash
pnpm lint
pnpm format
```
