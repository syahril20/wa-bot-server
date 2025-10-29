const axios = require("axios");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const path = require("path");
const { executablePath } = require("puppeteer");

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: {
    headless: true,
    executablePath: executablePath(), // 🟢 gunakan Chromium lokal bawaan puppeteer
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

client.on("qr", (qr) => {
  console.log(
    "📱 Scan QR Code di bawah ini pakai WhatsApp (Perangkat Tertaut):"
  );
  qrcode.generate(qr, { small: true }); // tampilkan QR di terminal
});
client.on("ready", () => console.log("✅ Bot WhatsApp siap digunakan!"));

// 🧠 Memory sementara per user
const sessions = {}; // { nomor_wa: { step, data } }

client.on("message", async (msg) => {
  const from = msg.from;
  const text = msg.body.trim();

  // 📌 Step 1 — input data pelanggan
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

  // 📌 Step 2 — input barang
  if (text.toLowerCase().startsWith("barang")) {
    const session = sessions[from];
    if (!session || session.step !== "barang") {
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
      "🛒 Barang disimpan.\nKetik *Barang1* jika ada tambahan, atau ketik *tidak* jika sudah selesai."
    );
    return;
  }

  // 📌 Step 3 — jika user ketik “tidak”
  if (text.toLowerCase() === "tidak") {
    const session = sessions[from];
    if (!session) {
      await msg.reply("⚠️ Belum ada data transaksi. Mulai dari awal ya.");
      return;
    }

    await msg.reply("💾 Menyimpan data ke server...");

    try {
      const response = await axios.post(
        "http://localhost:3000/api/save-transaksi",
        session.data
      );
      const nota_no = response.data.nota_no;

      await msg.reply("✅ Transaksi tersimpan! Membuat nota...");

      // 🔹 Generate nota dari Next.js
      const notaRes = await axios.post(
        "http://localhost:3000/api/generate-nota",
        { nota_no }
      );
      const base64 = notaRes.data.base64;
      const media = new MessageMedia("image/png", base64, "nota.png");

      await client.sendMessage(from, media, {
        caption: "🧾 Berikut nota pembelian kamu!",
      });
      delete sessions[from];
    } catch (err) {
      console.error("❌ Gagal simpan data:", err.message);
      await msg.reply(
        "❌ Terjadi kesalahan saat menyimpan data, coba lagi nanti."
      );
    }
    return;
  }
});

// 🟢 WAJIB: inisialisasi client biar bot mulai jalan
client.initialize();
