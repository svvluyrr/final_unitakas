import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import models
import database
import schemas
import auth
import os
import uuid
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

models.Base.metadata.create_all(bind=database.engine)

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/register")
async def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="E-posta zaten kayıtlı.")
    if not user.email.endswith("@sinop.edu.tr"):
        raise HTTPException(status_code=400, detail="Sadece @sinop.edu.tr maili kabul edilir.")
    hashed_pw = auth.get_password_hash(user.password)
    student_no = user.email.split("@")[0]
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pw,
        name=user.name if user.name else f"Öğrenci #{student_no}"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Kullanıcı başarıyla kaydedildi."}

@app.post("/login")
async def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")
    if not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")
    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "name": db_user.name
        }
    }

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece resim dosyası yüklenebilir.")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya 5MB'dan büyük olamaz.")
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    return {"url": f"/uploads/{filename}"}

def is_content_clean(text: str) -> bool:
    forbidden_words = ["yasak", "spam"]
    return not any(word in text.lower() for word in forbidden_words)

@app.post("/listings/")
async def create_listing(listing: schemas.ListingCreate, db: Session = Depends(get_db)):
    if not is_content_clean(listing.title) or not is_content_clean(listing.description):
        raise HTTPException(status_code=400, detail="İçerik moderasyon kurallarına uymuyor!")
    db_listing = models.Listing(**listing.dict())
    db.add(db_listing)
    db.commit()
    db.refresh(db_listing)
    return db_listing

@app.get("/listings/my/{owner_id}")
async def my_listings(owner_id: int, db: Session = Depends(get_db)):
    listings = db.query(models.Listing).filter(models.Listing.owner_id == owner_id).all()
    result = []
    for l in listings:
        result.append({
            "id": l.id,
            "title": l.title,
            "description": l.description,
            "category": l.category,
            "listing_type": l.listing_type,
            "price": l.price,
            "image_url": l.image_url,
            "owner_id": l.owner_id,
            "owner_name": l.sahibi.name if l.sahibi else "Bilinmiyor"
        })
    return result

# --- İLAN OLUŞTURMA (Tek ve Güncel Versiyon) ---
@app.post("/listings/")
async def create_listing(listing: schemas.ListingCreate, db: Session = Depends(get_db)):
    
    # 1. Moderasyon Kontrolü
    if not is_content_clean(listing.title) or not is_content_clean(listing.description):
        raise HTTPException(status_code=400, detail="İçerik moderasyon kurallarına uymuyor!")

    # 2. Veritabanına Kayıt
    db_listing = models.Listing(**listing.dict())
    db.add(db_listing)
    db.commit()
    db.refresh(db_listing)

    # 3. N8N Entegrasyonu
    try:
        owner = db.query(models.User).filter(models.User.id == listing.owner_id).first()

        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                "http://n8n:5678/webhook/yeni-ilan",
                json={
                    "owner_name": owner.name,
                    "owner_email": owner.email,
                    "title": listing.title,
                    "description": listing.description,
                    "category": listing.category,
                    "price": listing.price
                }
            )
    except Exception as e:
        print(f"N8N Entegrasyon hatası: {e}")

    return db_listing

# --- ANASAYFADA GÖZÜKMESİ İÇİN GEREKLİ KOD (Bunu eklemeyi unutma) ---
@app.get("/listings/")
async def get_all_listings(db: Session = Depends(get_db)):
    # Veritabanındaki tüm ilanları çeker
    listings = db.query(models.Listing).all()
    return listings

@app.delete("/listings/{listing_id}")
async def delete_listing(listing_id: int, owner_id: int, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")
    if listing.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Bu ilanı silme yetkiniz yok.")
    db.delete(listing)
    db.commit()
    return {"message": "İlan silindi."}

@app.post("/comments/")
async def add_comment(comment: schemas.CommentCreate, db: Session = Depends(get_db)):
    # Groq moderasyon
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            groq_response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{
                        "role": "user",
                        "content": f"Bu yorum hakaret, aşağılama, küfür veya argo içeriyor mu? 'salak', 'aptal', 'gerizekalı', 'mal', 'piç' gibi kelimeler UYGUNSUZ sayılır. Normal sorular ve günlük konuşmalar TEMİZ sayılır. Sadece TEMİZ veya UYGUNSUZ yaz:\n\n{comment.content}"
                    }],
                    "max_tokens": 10
                }
            )
            result = groq_response.json()
            answer = result["choices"][0]["message"]["content"].strip()
            if "UYGUNSUZ" in answer:
                raise HTTPException(status_code=400, detail="Yorum uygunsuz içerik barındırıyor.")
    except HTTPException:
        raise
    except Exception:
        pass

    # Yorumu kaydet
    db_comment = models.Comment(**comment.dict())
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)

    # Bildirim gönder
    try:
        listing = db.query(models.Listing).filter(models.Listing.id == comment.listing_id).first()
        commenter = db.query(models.User).filter(models.User.id == comment.owner_id).first()
        if listing and commenter:
            owner = db.query(models.User).filter(models.User.id == listing.owner_id).first()
            if owner and owner.id != commenter.id:
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.post(
                        "http://n8n:5678/webhook/yorum-bildirim",
                        json={
                            "owner_email": owner.email,
                            "owner_name": owner.name,
                            "listing_title": listing.title,
                            "comment": comment.content,
                            "commenter_name": commenter.name
                        }
                    )
    except Exception:
        pass

    return db_comment

@app.get("/comments/{listing_id}")
async def get_comments(listing_id: int, db: Session = Depends(get_db)):
    comments = db.query(models.Comment).filter(models.Comment.listing_id == listing_id).all()
    return [{"id": c.id, "content": c.content, "owner_id": c.owner_id, "yazar": c.yazar.name} for c in comments]

@app.delete("/comments/{comment_id}")
async def delete_comment(comment_id: int, owner_id: int, db: Session = Depends(get_db)):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı.")
    if comment.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Bu yorumu silme yetkiniz yok.")
    db.delete(comment)
    db.commit()
    return {"message": "Yorum silindi."}

@app.post("/contact")
async def contact_owner(data: dict, db: Session = Depends(get_db)):
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                "http://n8n:5678/webhook/iletisim-bildir",
                json=data
            )
    except Exception:
        pass
    return {"message": "Bildirim gönderildi."}