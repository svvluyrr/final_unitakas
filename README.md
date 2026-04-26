# UniTakas — Üniversite Takas Platformu
 
> Sinop Üniversitesi öğrencilerine özel, doğrulanmış kimlikle güvenli takas platformu.
 
---
 
## 📌 Proje Hakkında
 
UniTakas, üniversite öğrencilerinin ders notlarını, kitaplarını ve çeşitli eşyalarını güvenli bir şekilde takas edebileceği, yalnızca `@sinop.edu.tr` uzantılı okul e-postasıyla kayıt olmayı zorunlu kılan bir platformdur. Kullanıcılar ilan verebilir, ilanları inceleyebilir, yorum yapabilir ve ilan sahipleriyle iletişime geçebilir.
 
---
 
## 🚀 Özellikler
 
- 🔒 **Doğrulanmış Kimlik** — Yalnızca `@sinop.edu.tr` uzantılı e-posta ile kayıt
- 📋 **İlan Yönetimi** — İlan oluşturma, listeleme, filtreleme ve silme
- 📷 **Fotoğraf Yükleme** — İlanlara görsel ekleme (max 5MB)
- 💬 **Yorum Sistemi** — İlanlara yorum yapma ve silme
- 🤖 **AI Moderasyon** — Groq (LLaMA) ile otomatik yorum sansürü
- 📧 **E-posta Bildirimleri** — n8n ile yorum ve iletişim bildirimleri
- 🔍 **Arama & Filtreleme** — Kategori ve anahtar kelimeyle ilan arama
- 📱 **Responsive Tasarım** — Mobil uyumlu arayüz
---
 
## 🏗️ Mimari
 
```
unitakas_final/
├── backend/
│   ├── main.py          # FastAPI uygulama & endpoint'ler
│   ├── models.py        # SQLAlchemy veritabanı modelleri
│   ├── schemas.py       # Pydantic şemaları
│   ├── auth.py          # JWT & bcrypt kimlik doğrulama
│   ├── database.py      # PostgreSQL bağlantısı
│   └── requirements.txt
├── frontend/
│   ├── uni_takas.html   # Ana HTML
│   ├── uni_takas.css    # Stiller
│   └── uni_takas.js     # Frontend mantığı
└── docker-compose.yml
```
 
---
 
## 🛠️ Teknoloji Yığını
 
| Katman | Teknoloji |
|--------|-----------|
| Frontend | HTML, CSS, Vanilla JS |
| Backend | FastAPI (Python) |
| Veritabanı | PostgreSQL 15 |
| ORM | SQLAlchemy |
| Kimlik Doğrulama | JWT + bcrypt |
| AI Moderasyon | Groq API (LLaMA 3.3 70B) |
| Otomasyon | n8n |
| E-posta | Gmail SMTP |
| Containerization | Docker + Docker Compose |
| Web Sunucusu | Nginx |
 
---
 
## ⚙️ Kurulum
 
### Gereksinimler
 
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) yüklü olmalı
- Groq API key ([console.groq.com](https://console.groq.com))
- Gmail uygulama şifresi ([myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))

### 4. Servislere Eriş
 
| Servis | URL |
|--------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| n8n | http://localhost:5678 |
 ---
 
## 🔌 API Endpoint'leri
 
### Kimlik Doğrulama
 
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/register` | Yeni kullanıcı kaydı |
| POST | `/login` | Giriş yap, JWT token al |
 
### İlanlar
 
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/listings/` | Tüm ilanları listele |
| POST | `/listings/` | Yeni ilan oluştur |
| GET | `/listings/my/{owner_id}` | Kullanıcının ilanları |
| DELETE | `/listings/{id}` | İlan sil |
 
### Yorumlar
 
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/comments/{listing_id}` | İlan yorumlarını getir |
| POST | `/comments/` | Yorum ekle (AI moderasyon ile) |
| DELETE | `/comments/{id}` | Yorum sil |
 
### Diğer
 
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/upload-image` | Fotoğraf yükle |
| POST | `/contact` | İletişim bildirimi gönder |
 
---
 
## 🤖 AI Moderasyon
 
Yorum gönderildiğinde otomatik olarak **Groq API** (LLaMA 3.3 70B modeli) üzerinden moderasyon kontrolü yapılır. Hakaret, küfür veya argo içeren yorumlar reddedilir.
 
```
Kullanıcı yorum yazar
        ↓
Groq API'ye gönderilir
        ↓
TEMİZ → Veritabanına kaydedilir
UYGUNSUZ → HTTP 400 hatası döner
```
 
---
 
## 📧 n8n Workflow'ları
 
n8n `http://localhost:5678` adresinden erişilebilir.
- **Kullanıcı adı:** `admin`
- **Şifre:** `admin_sifre`
  
### Yorum Bildirimi Workflow'u
- Tetikleyici: `POST /webhook/yorum-bildirim`
- Eylem: İlan sahibine Gmail ile bildirim gönderir
  
### İletişim Bildirimi Workflow'u
- Tetikleyici: `POST /webhook/iletisim-bildir`
- Eylem: İlan sahibine ilgi bildirimi gönderir
---
 
## 🗄️ Veritabanı Şeması
```sql
-- Kullanıcılar
users (id, email, name, hashed_password)
 
-- İlanlar
listings (id, title, description, category, listing_type, 
          price, image_url, owner_id)
 
-- Yorumlar
comments (id, content, owner_id, listing_id)
```
 
---
 
## 🐳 Docker Servisleri
| Servis | Image | Port |
|--------|-------|------|
| frontend | nginx:alpine | 80 |
| backend | unitakas-backend | 8000 |
| db | postgres:15 | 5432 |
| n8n | n8nio/n8n | 5678 |
 ---
 
## 🔐 Güvenlik
- Tüm şifreler **bcrypt** ile hashlenir
- JWT token ile oturum yönetimi (30 dakika geçerlilik)
- Yalnızca `@sinop.edu.tr` uzantılı e-postalar kabul edilir
- Fotoğraf boyutu 5MB ile sınırlıdır
- AI destekli yorum moderasyonu
---
