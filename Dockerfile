# ✅ Gunakan image resmi Puppeteer yang sudah lengkap dengan Chromium
FROM ghcr.io/puppeteer/puppeteer:22.9.0

WORKDIR /app

# Gunakan root agar bisa install dan ubah permission
USER root

COPY package*.json ./
RUN chmod -R 777 /app && npm install

COPY . .

# ✅ Pastikan Puppeteer tidak download ulang Chromium (karena sudah include)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

EXPOSE 8080

# Kembali ke user aman bawaan Puppeteer
USER pptruser

CMD ["npm", "start"]
