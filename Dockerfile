# Gunakan base image dengan Puppeteer + Chromium
FROM ghcr.io/puppeteer/puppeteer:22.9.0

WORKDIR /app

# Jalankan sebagai root dulu biar bisa install tanpa masalah
USER root

# Copy dependency
COPY package*.json ./

# Perbaiki permission dan install dependencies
RUN chmod -R 777 /app && npm install

# Copy seluruh source code
COPY . .

# Pastikan environment Puppeteer benar
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Jalankan sebagai user aman bawaan Puppeteer
USER pptruser

EXPOSE 3001
CMD ["npm", "start"]
