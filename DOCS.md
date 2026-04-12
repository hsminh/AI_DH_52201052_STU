# Tài liệu hệ thống — STU Project

## Tổng quan kiến trúc

```
Frontend (Next.js)          Backend (Django)
─────────────────           ─────────────────
/consumer/...      ──────►  /api/fitness/
/space/...         ──────►  /api/documents/
                            /api/chatbot/
                            /api/accounts/
```

---

## 1. URL Prefix & Route Map

### Consumer Portal — `/consumer/...`
Dành cho người dùng cuối (role: `CONSUMER`).

| URL | Trang |
|-----|-------|
| `/consumer/login` | Đăng nhập Consumer |
| `/consumer/dashboard` | Trang chủ |
| `/consumer/chat` | AI Chatbot |
| `/consumer/fitness` | Phân tích bữa ăn (text + ảnh) |
| `/consumer/cooking` | Tra cứu công thức nấu ăn |
| `/consumer/profile` | Hồ sơ cá nhân |
| `/consumer/settings` | Cài đặt tài khoản |

### Space Portal — `/space/...`
Dành cho quản trị viên (role: `USER`).

| URL | Trang |
|-----|-------|
| `/space/login` | Đăng nhập Space |
| `/space/documents` | Quản lý tài liệu RAG |

---

## 2. Token Authentication

Hệ thống sử dụng **2 token riêng biệt** lưu trong `localStorage`:

| Token | Key trong localStorage | Dùng cho |
|-------|----------------------|----------|
| Consumer | `consumer_access_token` | Mọi request từ `/consumer/...` |
| Consumer Refresh | `consumer_refresh_token` | Làm mới token Consumer |
| User/Space | `user_access_token` | Mọi request từ `/space/...` |
| User/Space Refresh | `user_refresh_token` | Làm mới token User |

### Cách hoạt động

```
/consumer/login  ──► AuthApi.consumerLogin()
                      └─► POST /api/accounts/consumer/login/
                      └─► Lưu consumer_access_token + consumer_refresh_token

/space/login     ──► AuthApi.userLogin()
                      └─► POST /api/accounts/user/login/
                      └─► Lưu user_access_token + user_refresh_token
```

`base.api.ts` tự động phát hiện token cần dùng dựa vào URL:
- URL bắt đầu `/space` → đọc `user_access_token`
- URL khác → đọc `consumer_access_token`

---

## 3. Luồng đăng nhập

### Consumer
1. Truy cập `http://localhost:3000/consumer/login`
2. Nhập username / password (role phải là `CONSUMER`)
3. Sau đăng nhập → redirect `/consumer/dashboard`
4. Token được lưu: `consumer_access_token`

### Space (Admin)
1. Truy cập `http://localhost:3000/space/login`
2. Nhập username / password (role phải là `USER`)
3. Sau đăng nhập → redirect `/space/documents`
4. Token được lưu: `user_access_token`

### Đăng nhập đồng thời 2 portal
Vì token tách biệt, bạn **có thể đăng nhập cả hai** trên cùng một trình duyệt:
- Tab 1: `/consumer/dashboard` — dùng `consumer_access_token`
- Tab 2: `/space/documents` — dùng `user_access_token`
- Logout portal này **không ảnh hưởng** portal kia.

---

## 4. Cấu trúc thư mục Frontend

```
frontend/src/
├── app/
│   ├── consumer/
│   │   ├── login/page.tsx          # Trang đăng nhập Consumer
│   │   └── (portal)/               # Route group — layout chung
│   │       ├── layout.tsx          # Sidebar + Header Consumer
│   │       ├── dashboard/page.tsx
│   │       ├── chat/page.tsx
│   │       ├── fitness/page.tsx
│   │       ├── cooking/page.tsx
│   │       ├── profile/page.tsx
│   │       └── settings/page.tsx
│   ├── space/
│   │   ├── login/page.tsx          # Trang đăng nhập Space
│   │   └── (admin)/                # Route group — layout chung
│   │       └── documents/page.tsx
│   └── user/
│       └── login/page.tsx          # Alias → redirect /space/login
│
├── modules/
│   ├── auth/
│   │   ├── api/auth.api.ts         # consumerLogin / userLogin
│   │   └── hooks/useAuth.ts        # Kiểm tra token theo role
│   ├── fitness/
│   │   └── api/fitness.api.ts      # analyzeText / analyzeImage / getCookingRecipe
│   ├── chat/
│   └── documents/
│
└── shared/
    └── api/base.api.ts             # AbstractApiClient — token logic
```

---

## 5. Backend API Endpoints

### Accounts
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/accounts/consumer/login/` | Đăng nhập Consumer |
| POST | `/api/accounts/user/login/` | Đăng nhập User/Admin |
| POST | `/api/accounts/register/` | Đăng ký tài khoản |
| GET | `/api/accounts/profile/` | Lấy thông tin user hiện tại |

### Fitness (yêu cầu Consumer token)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/fitness/analyze-text/` | Phân tích bữa ăn từ text |
| POST | `/api/fitness/analyze-image/` | Phân tích bữa ăn từ ảnh |
| POST | `/api/fitness/cooking-recipe/` | Tra cứu công thức |

### Documents (yêu cầu User token)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/documents/` | Danh sách tài liệu |
| POST | `/api/documents/upload/` | Tải tài liệu lên |
| DELETE | `/api/documents/{id}/` | Xoá tài liệu |

### Chatbot (yêu cầu Consumer token)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/chatbot/chat/` | Gửi tin nhắn |
| POST | `/api/chatbot/clear/` | Xoá lịch sử chat |

---

## 6. AI Model Combos (OmniRoute)

OmniRoute chạy tại `http://localhost:20128`. Mỗi request thử lần lượt theo thứ tự ưu tiên:

### Text Analysis
```
fast-text-combo  →  text-smart-combo  →  free-stack
```
| Combo | Mô tả | Models bên trong |
|-------|-------|-----------------|
| `fast-text-combo` | Ưu tiên tốc độ | gemini-cli/gemini-2.5-flash (0.19s), groq/llama-3.3-70b, ... |
| `text-smart-combo` | Cân bằng | gemini/gemini-2.5-flash, gpt-4o-mini, ... |
| `free-stack` | Backup miễn phí | gemini-cli, groq, ... |

### Vision Analysis (đọc ảnh)
```
fast-vision-combo  →  vision-ultra-combo  →  free-stack
```
| Combo | Mô tả | Models bên trong |
|-------|-------|-----------------|
| `fast-vision-combo` | Ưu tiên tốc độ | gh/claude-haiku-4.5 (0.8s), gh/gpt-4o, ... |
| `vision-ultra-combo` | Chất lượng cao | gemini-2.5-flash-image, ... |
| `free-stack` | Backup miễn phí | — |

---

## 7. RAG (Retrieval-Augmented Generation)

Trước mỗi request AI, hệ thống **tự động tìm tài liệu liên quan** từ ChromaDB:

```
User request
    ↓
RAGService.get_relevant_context(query, k=3)
    ↓
  [Tìm thấy]                    [Không tìm thấy]
  Thêm system message           Bỏ qua, gọi AI
  với tài liệu tham khảo        bình thường
    ↓
AI trả lời dựa trên tài liệu
```

**Để thêm tài liệu vào RAG:**
1. Đăng nhập Space: `/space/login`
2. Vào `/space/documents`
3. Upload file PDF hoặc TXT
4. Hệ thống tự động xử lý và lưu vào ChromaDB

---

## 8. Khởi động hệ thống

```bash
# 1. Khởi động OmniRoute (Docker)
docker start omniroute

# 2. Khởi động Backend Django
cd /path/to/project
source .venv/bin/activate
python manage.py runserver

# 3. Khởi động Frontend Next.js
cd frontend
yarn dev
```

Truy cập:
- Consumer: http://localhost:3000/consumer/login
- Space:    http://localhost:3000/space/login
