require("dotenv").config();
const axios = require("axios");
const express = require("express");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/", (_, res) => res.send("🤖 WA Bot Server is running"));
app.listen(PORT, () => console.log(`🌐 Server aktif di port ${PORT}`));

// Inisialisasi Client WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: {
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

// QR dan event dasar
client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("✅ Bot WhatsApp siap digunakan!"));
client.on("disconnected", (reason) => {
  console.log("⚠️ Terputus:", reason);
  client.initialize(); // auto reconnect
});

// Simpan session user sementara
const sessions = {};

// Handler pesan masuk
client.on("message", async (msg) => {
  const from = msg.from;
  const text = msg.body.trim();

  // STEP 1: Data pelanggan
  if (
    text.toLowerCase().includes("nama") &&
    text.toLowerCase().includes("alamat") &&
    text.toLowerCase().includes("telepon")
  ) {
    const lines = text.split("\n");
    const data = {};
    lines.forEach((line) => {
      const [key, value] = line.split(":").map((s) => s.trim());
      if (key && value) data[key.toLowerCase()] = value;
    });

    sessions[from] = {
      step: "barang",
      data: {
        nama: data.nama,
        alamat: data.alamat,
        telepon: data.telepon,
        barang: [],
      },
    };

    await msg.reply(
      "✅ Data pelanggan disimpan.\nSekarang kirim data Barang1 dengan format:\n\nBarang1\nNama : [nama barang]\nQty : [jumlah]\nHarga : [harga]"
    );
    return;
  }

  // STEP 2: Barang
  if (text.toLowerCase().startsWith("barang")) {
    const session = sessions[from];
    if (!session) {
      await msg.reply("⚠️ Kirim dulu data pelanggan (nama, alamat, telepon).");
      return;
    }

    const lines = text.split("\n");
    const barang = {};
    lines.forEach((line) => {
      const [key, value] = line.split(":").map((s) => s.trim());
      if (key && value) barang[key.toLowerCase()] = value;
    });

    session.data.barang.push(barang);
    await msg.reply(
      "🛒 Barang disimpan.\nKetik *Barang2* jika ada tambahan, atau *tidak* jika sudah selesai."
    );
    return;
  }

  // STEP 3: Selesai input
  if (text.toLowerCase() === "tidak") {
    const session = sessions[from];
    if (!session) {
      await msg.reply("⚠️ Belum ada data transaksi. Mulai dari awal ya.");
      return;
    }

    await msg.reply("💾 Menyimpan data ke server...");

    try {
      const baseUrl = process.env.NEXT_API_BASE_URL;
      const saveUrl = `${baseUrl}/api/save-transaksi`;
      const notaUrl = `${baseUrl}/api/generate-nota`;

      const response = await axios.post(saveUrl, session.data);
      const nota_no = response.data.nota_no;

      await msg.reply("✅ Transaksi tersimpan! Membuat nota...");

      const notaRes = await axios.post(notaUrl, { nota_no });
      const base64 = notaRes.data.base64;
      const media = new MessageMedia("image/png", base64, "nota.png");

      await client.sendMessage(from, media, {
        caption: "🧾 Berikut nota pembelian kamu!",
      });
      delete sessions[from];
    } catch (err) {
      console.error("❌ Gagal simpan data:", err.message);
      await msg.reply(
        "❌ Terjadi kesalahan saat menyimpan data ke server. Coba lagi nanti."
      );
    }
    return;
  }
});

client.initialize();
