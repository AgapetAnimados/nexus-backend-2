import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cors());

// 🔥 SOLO UNA VEZ ESTA LÍNEA
const PORT = process.env.PORT || 10000;

// Conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(30) NOT NULL,
        sender VARCHAR(20) DEFAULT 'customer',
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("📦 Tabla lista en PostgreSQL");
  } catch (err) {
    console.error("❌ Error creando tabla:", err);
  }
}
initDB();

// Rutas
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Nexus backend activo 💥" });
});

// GET mensajes por número
app.get("/messages/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;
    const result = await pool.query(
      "SELECT * FROM whatsapp_messages WHERE phone=$1 ORDER BY created_at ASC",
      [phone]
    );

    res.json({
      status: "success",
      total: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error("❌ Error obteniendo mensajes:", err);
    res.status(500).json({ status: "error" });
  }
});

// POST enviar mensaje manual
app.post("/messages/send", async (req, res) => {
  try {
    const { phone, message } = req.body;

    await pool.query(
      "INSERT INTO whatsapp_messages (phone, sender, message) VALUES ($1,$2,$3)",
      [phone, "agent", message]
    );

    return res.json({ status: "sent" });

  } catch (err) {
    console.error("❌ Error enviando mensaje:", err);
    res.status(500).json({ status: "error" });
  }
});

// Webhook n8n
app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const { phone, message } = req.body;

    await pool.query(
      "INSERT INTO whatsapp_messages (phone, sender, message) VALUES ($1,$2,$3)",
      [phone, "customer", message]
    );

    res.json({ status: "ok" });

  } catch (err) {
    console.error("❌ Error Webhook:", err);
    res.status(500).json({ status: "error" });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`🔥 Backend escuchando en puerto ${PORT}`);
});
