# Python'un hafif bir versiyonunu kullan
FROM python:3.11-slim

# Konteyner içinde çalışacağımız ana klasör
WORKDIR /app

# Önce sadece gereksinim dosyasını kopyala (Docker bunu önbelleğe alır, hızlı çalışır)
COPY requirements.txt .

# Kütüphaneleri kur
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Şimdi tüm kodlarını kopyala
COPY . .

# FastAPI uygulamasını çalıştır
# main.py dosyan backend klasörünün tam içindeyse:
# Dockerfile dosyanın en altındaki satırı şu şekilde yap:
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]