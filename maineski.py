from fastapi import FastAPI
from pydantic import BaseModel
import httpx

app = FastAPI()

# Bu kısım tarayıcıda "not found" almanı engeller
@app.get("/")
async def ana_sayfa():
    return {"mesaj": "UniTakas Backend Calisiyor!"}

# İlan modeli
class Ilan(BaseModel):
    tur: str
    baslik: str
    detay: str
    paylasim_tipi: str
    mail: str

@app.post("/ekle")
async def ilan_ekle(ilan: Ilan):
    N8N_WEBHOOK_URL = "http://localhost:5678/webhook-test/yeni-ilan"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(N8N_WEBHOOK_URL, json=ilan.dict())
            return {"durum": "Basarili", "ilan": ilan.baslik}
        except Exception as e:
            return {"durum": "n8n baglanti hatasi", "detay": str(e)}