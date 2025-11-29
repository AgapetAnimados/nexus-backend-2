import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

// Inicializar Express
const app = express();
app.use(express.json());
app.use(cors());

// Conexión a PostgreSQL (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla si no existe
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(30) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("📦 Tabla 'whatsapp_messages' lista en PostgreSQL.");
  } catch (err) {
    console.error("❌ Error creando tabla:", err);
  }
}
initDB();

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Nexus backend activo 💥" });
});

// Webhook para N8N → Guardar mensajes
app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        status: "error",
        message: "Faltan campos: phone o message"
      });
    }

    await pool.query(
      "INSERT INTO whatsapp_messages (phone, message) VALUES ($1, $2)",
      [phone, message]
    );

    res.json({ status: "ok", received: true });
  } catch (err) {
    console.error("❌ Error guardando mensaje:", err);
    res.status(500).json({ status: "error", message: "Error interno" });
  }
});

// Puerto para Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🔥 Nexus backend escuchando en el puerto ${PORT}`);
});
