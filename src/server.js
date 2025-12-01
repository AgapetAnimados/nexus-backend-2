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
  ssl: { rejectUnauthorized: false },
});

// Crear tabla si no existe + asegurar columna sender
async function initDB() {
  try {
    // Crear tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(30) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Asegurar columna sender
    await pool.query(`
      ALTER TABLE whatsapp_messages
      ADD COLUMN IF NOT EXISTS sender VARCHAR(20) DEFAULT 'customer';
    `);

    console.log("📦 Tabla 'whatsapp_messages' lista en PostgreSQL (con sender).");
  } catch (err) {
    console.error("❌ Error creando/actualizando tabla:", err);
  }
}
initDB();

// ================================
// RUTA DE PRUEBA
// ================================
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Nexus backend activo 💥" });
});

// ================================
// 1) LISTA DE CONVERSACIONES
//    (1 por cada número de teléfono)
// ================================
app.get("/conversations", async (req, res) => {
  try {
    // Tomamos el ÚLTIMO mensaje por cada phone
    const result = await pool.query(`
      SELECT DISTINCT ON (phone)
        phone,
        message AS last_message,
        created_at AS last_message_at
      FROM whatsapp_messages
      ORDER BY phone, created_at DESC;
    `);

    res.json({
      status: "success",
      total: result.rows.length,
      data: result.rows, // [{ phone, last_message, last_message_at }, ...]
    });
  } catch (error) {
    console.error("❌ Error al obtener conversaciones:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// ================================
// 2) MENSAJES POR CONVERSACIÓN
//    Usamos el phone como conversationId
// ================================
app.get("/messages/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

    const result = await pool.query(
      `
      SELECT id, phone, message, sender, created_at
      FROM whatsapp_messages
      WHERE phone = $1
      ORDER BY created_at ASC;
    `,
      [phone]
    );

    res.json({
      status: "success",
      total: result.rows.length,
      data: result.rows, // [{ id, phone, message, sender, created_at }, ...]
    });
  } catch (error) {
    console.error("❌ Error obteniendo mensajes:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// ================================
// 3) ENVIAR MENSAJE DESDE NEXUS
//    (cuando el agente escribe)
// ================================
app.post("/messages/send", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        status: "error",
        message: "Faltan campos: phone o message",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO whatsapp_messages (phone, message, sender)
      VALUES ($1, $2, 'agent')
      RETURNING id, phone, message, sender, created_at;
    `,
      [phone, message]
    );

    res.json({
      status: "success",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error enviando mensaje:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// ================================
// 4) WEBHOOK N8N → GUARDA MENSAJES
//    (mensajes que vienen de WhatsApp)
// ================================
app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        status: "error",
        message: "Faltan campos: phone o message",
      });
    }

    await pool.query(
      "INSERT INTO whatsapp_messages (phone, message, sender) VALUES ($1, $2, 'customer')",
      [phone, message]
    );

    res.json({ status: "ok", received: true });
  } catch (err) {
    console.error("❌ Error guardando mensaje:", err);
    res.status(500).json({ status: "error", message: "Error interno" });
  }
});

// ================================
// PUERTO PARA RENDER
// ================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🔥 Nexus backend escuchando en el puerto ${PORT}`);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🔥 Nexus backend escuchando en el puerto ${PORT}`);
});

