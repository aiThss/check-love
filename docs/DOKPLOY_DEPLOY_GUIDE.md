# Deploy LoveCheck trên Dokploy

Guide này dùng 3 domain bạn đã có:

- PWA: `checklove.babyress.games`
- API: `api.checklove.babyress.games`
- Admin: `admin.checklove.babyress.games`

## 1. Chuẩn bị DNS Cloudflare

Tạo 3 record trỏ về server chạy Dokploy:

| Type | Name | Target |
| --- | --- | --- |
| A/CNAME | `checklove` | IP hoặc host Dokploy |
| A/CNAME | `api.checklove` | IP hoặc host Dokploy |
| A/CNAME | `admin.checklove` | IP hoặc host Dokploy |

Nếu dùng Cloudflare proxy, SSL nên để `Full` hoặc `Full (strict)` khi Dokploy đã cấp HTTPS.

## 2. Tạo app trong Dokploy

1. Vào Dokploy, tạo Project mới.
2. Chọn deploy từ GitHub repo: `https://github.com/aiThss/check-love`.
3. Chọn Docker Compose.
4. Compose file: `docker-compose.yml`.
5. Add environment variables từ `.env.example`, rồi sửa secret thật.

## 3. Env production mẫu

```env
NODE_ENV=production
PORT=4000

PUBLIC_WEB_BASE_URL=https://checklove.babyress.games
PUBLIC_API_BASE_URL=https://api.checklove.babyress.games
PUBLIC_ADMIN_BASE_URL=https://admin.checklove.babyress.games
VITE_API_BASE_URL=https://api.checklove.babyress.games/api
VITE_PUSH_PUBLIC_KEY=
CORS_ORIGINS=https://checklove.babyress.games,https://admin.checklove.babyress.games

JWT_SECRET=doi-thanh-chuoi-random-that-dai
MONGODB_URI=mongodb://mongo:27017/lovecheck
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_MB=10

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=doi-mat-khau-admin-that-manh

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=hello.couple@gmail.com
SMTP_PASS=app-password-gmail
MAIL_FROM="LoveCheck <hello.couple@gmail.com>"
OTP_TTL_MINUTES=10
REQUIRE_LOGIN_OTP=false

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Lưu ý Gmail: phải dùng Gmail App Password. Không dùng mật khẩu đăng nhập Gmail thường.

## 4. Gắn domain vào service

Trong Dokploy, map domain theo service:

| Service | Domain | Internal port |
| --- | --- | --- |
| `pwa` | `checklove.babyress.games` | `80` |
| `api` | `api.checklove.babyress.games` | `4000` |
| `admin` | `admin.checklove.babyress.games` | `80` |

API health check:

```bash
curl https://api.checklove.babyress.games/api/health
```

Kết quả đúng:

```json
{"ok":true,"name":"lovecheck-api"}
```

## 5. Deploy

1. Bấm Deploy trong Dokploy.
2. Chờ service `mongo`, `api`, `pwa`, `admin` lên healthy/running.
3. Mở:
   - `https://checklove.babyress.games`
   - `https://admin.checklove.babyress.games`
4. Trên iPhone mở PWA bằng Safari, bấm Share rồi Add to Home Screen.

## 6. Backup

MongoDB:

```bash
docker compose exec mongo mongodump --archive=/tmp/lovecheck.archive
docker compose cp mongo:/tmp/lovecheck.archive ./backups/lovecheck.archive
```

Uploads:

```bash
docker run --rm -v check-in-luv_uploads:/data -v "$PWD/backups:/backup" alpine tar czf /backup/uploads.tar.gz -C /data .
```

Restore MongoDB:

```bash
docker compose cp ./backups/lovecheck.archive mongo:/tmp/lovecheck.archive
docker compose exec mongo mongorestore --archive=/tmp/lovecheck.archive --drop
```

## 7. Checklist sau deploy

- `GET /api/health` trả `ok: true`.
- PWA tạo tài khoản bằng OTP email được.
- PWA upload ảnh/check-in text được.
- Admin login bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD` được.
- Upload volume không mất sau restart.
- `CORS_ORIGINS` không thiếu domain PWA/Admin.
