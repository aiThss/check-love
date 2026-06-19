# LoveCheck / CheckLove

PWA check-in riêng tư cho 1 cặp đôi, lấy cảm hứng từ Locket/BeReal nhưng tối giản hơn: gửi ảnh, text, mood, reaction, memories, streak, random prompt và admin web.

## Stack

- `apps/api`: Node.js + Fastify + TypeScript + MongoDB/Mongoose.
- `apps/web`: React + Vite PWA cho iPhone Safari và Android Chrome.
- `apps/admin`: React + Vite admin dashboard.
- Upload ảnh giai đoạn đầu lưu local volume qua `UPLOAD_DIR`; service đã tách riêng để sau này đổi sang Cloudflare R2/S3.
- Docker Compose chạy MongoDB, API, PWA và Admin.

## Domain đang cấu hình

- PWA: `https://lovestory.babyress.games`
- API: `https://api.lovestory.babyress.games/api`
- Admin: `https://admin.lovestory.babyress.games`

## Chạy local

```bash
npm install
npm run icons
cp .env.example .env
npm run dev:api
npm run dev:web
npm run dev:admin
```

Local mặc định:

- API: `http://localhost:4000/api/health`
- PWA: `http://localhost:5173`
- Admin: `http://localhost:5174`

MongoDB local cần chạy ở `mongodb://localhost:27017/lovecheck`, hoặc sửa `MONGODB_URI` trong `.env`.

## OTP email Gmail

Trong `.env`, dùng Gmail App Password, không dùng mật khẩu Gmail thường:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=hello.couple@gmail.com
SMTP_PASS=your-gmail-app-password
MAIL_FROM="LoveCheck <hello.couple@gmail.com>"
```

Nếu bạn muốn email khác, đổi `SMTP_USER` và `MAIL_FROM`. Khi chưa cấu hình SMTP ở môi trường development, API trả `devCode` để test nhanh.

## Biến môi trường chính

- `JWT_SECRET`: chuỗi dài ngẫu nhiên để ký JWT.
- `MONGODB_URI`: MongoDB connection string.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: tài khoản admin.
- `PUBLIC_WEB_BASE_URL`, `PUBLIC_API_BASE_URL`, `PUBLIC_ADMIN_BASE_URL`: URL public.
- `CORS_ORIGINS`: danh sách origin được phép gọi API.
- `UPLOAD_DIR`: thư mục/volume lưu ảnh.
- `MAX_UPLOAD_MB`: giới hạn upload ảnh, mặc định 10MB.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: optional, bật Web Push thật.

Tạo VAPID keys:

```bash
npx web-push generate-vapid-keys
```

## Deploy Dokploy

Guide nhanh nằm bên dưới. Bản chi tiết hơn: [`docs/DOKPLOY_DEPLOY_GUIDE.md`](docs/DOKPLOY_DEPLOY_GUIDE.md).

1. Tạo project mới trong Dokploy, trỏ repo/source này vào project.
2. Copy `.env.example` thành `.env` và điền secret thật.
3. Đặt `PUBLIC_*` và `CORS_ORIGINS` đúng domain production:

```env
PUBLIC_WEB_BASE_URL=https://lovestory.babyress.games
PUBLIC_API_BASE_URL=https://api.lovestory.babyress.games
PUBLIC_ADMIN_BASE_URL=https://admin.lovestory.babyress.games
CORS_ORIGINS=https://lovestory.babyress.games,https://admin.lovestory.babyress.games
VITE_API_BASE_URL=https://api.lovestory.babyress.games/api
```

4. Deploy bằng `docker-compose.yml`.
5. Trong Dokploy, gắn domain:
   - service `pwa` -> `lovestory.babyress.games`
   - service `api` -> `api.lovestory.babyress.games`
   - service `admin` -> `admin.lovestory.babyress.games`
6. Bật HTTPS/SSL trong Dokploy.
7. Kiểm tra health check: `https://api.lovestory.babyress.games/api/health`.

Compose production dùng internal `expose` thay vì host `ports`; Dokploy/Traefik sẽ route domain vào service, nên không cần chiếm port `8080`, `8081`, hay `4000` trên host.

## DNS Cloudflare

Tạo 3 record:

- `A` hoặc `CNAME` cho `lovestory.babyress.games` trỏ về server Dokploy.
- `A` hoặc `CNAME` cho `api.lovestory.babyress.games` trỏ về server Dokploy.
- `A` hoặc `CNAME` cho `admin.lovestory.babyress.games` trỏ về server Dokploy.

Nếu Dokploy tự cấp SSL qua Let's Encrypt, để proxy Cloudflare ở chế độ phù hợp với cấu hình SSL của server.

## Dùng trên iPhone

1. Mở `https://lovestory.babyress.games` bằng Safari.
2. Bấm nút Share.
3. Chọn Add to Home Screen.
4. Mở icon LoveCheck ngoài màn hình chính.

PWA có `manifest.webmanifest`, service worker, icon nhiều kích thước, `apple-touch-icon` và màn `/install`.

## APK Android

Project có Android wrapper bằng Capacitor tại `android/`. Build debug APK:

```bash
npm run build:apk
```

Guide chi tiết: [`docs/ANDROID_APK_GUIDE.md`](docs/ANDROID_APK_GUIDE.md).

## Backup

MongoDB volume:

```bash
docker compose exec mongo mongodump --archive=/tmp/lovecheck.archive
docker compose cp mongo:/tmp/lovecheck.archive ./backups/lovecheck.archive
```

Uploads volume:

```bash
docker run --rm -v check-in-luv_uploads:/data -v "$PWD/backups:/backup" alpine tar czf /backup/uploads.tar.gz -C /data .
```

Restore MongoDB:

```bash
docker compose cp ./backups/lovecheck.archive mongo:/tmp/lovecheck.archive
docker compose exec mongo mongorestore --archive=/tmp/lovecheck.archive --drop
```

## Source nhẹ

Không đưa các thư mục sinh tự động vào source/repo: `node_modules/`, `dist/`, `build/`, `.next/`, `.turbo/`, `.vite/`, `.dart_tool/`, `android/.gradle/`, `.gradle/`, `coverage/`, `uploads/`, `.env`, APK/build output.

Project cũ nếu nặng hơn 1GB thường là do build artifacts Flutter, `.dart_tool`, `node_modules`, Gradle cache, APK output và `libflutter.so` cho nhiều kiến trúc CPU. Source thật của app này được giữ nhẹ và có `.gitignore`/`.dockerignore` để tránh kéo cache vào.
