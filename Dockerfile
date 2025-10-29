# Gunakan base image dengan Puppeteer + Chromium
FROM ghcr.io/puppeteer/puppeteer:22.9.0

WORKDIR /app

# Copy dependency
COPY package*.json ./
RUN npm install

# Copy seluruh source code
COPY . .

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3001
CMD ["npm", "start"]
