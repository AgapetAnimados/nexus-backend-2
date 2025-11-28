// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ------------------ CONFIG DB (Postgres en Render) ------------------
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Crear tabla si no existe
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        raw JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Tabla "messages" lista en la base de datos');
  } catch (err) {
    console.error('❌ Error inicializando la base de datos:', err);
  }
}

initDb();

// ------------------ RUTAS ------------------

// Ruta simple para probar que el backend está vivo
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nexus backend activo 🚀',
  });
});

// 🔔 WEBHOOK DESDE N8N / WHATSAPP
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    console.log('📩 Body recibido en webhook:', req.body);

    const body = req.body || {};

    const phone =
      body.phone ||
      body.celular ||
      body.wa_id ||
      '';
    const message =
      body.message ||
      body.mensaje ||
      '';

    if (!phone || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Faltan campos: phone o message',
      });
    }

    const insertQuery = `
      INSERT INTO messages (phone, message, raw)
      VALUES ($1, $2, $3)
      RETURNING id, phone, message, created_at;
    `;

    const values = [phone, message, body];

    const result = await pool.query(insertQuery, values);

    res.status(200).json({
      status: 'ok',
      message: 'Webhook recibido y guardado correctamente',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('❌ Error guardando mensaje del webhook:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error interno',
    });
  }
});

// 📥 LISTAR MENSAJES CRUDOS
app.get('/messages', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, phone, message, created_at
      FROM messages
      ORDER BY created_at DESC
      LIMIT 200;
    `);

    res.json({
      status: 'ok',
      total: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    console.error('❌ Error al consultar mensajes:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error al consultar mensajes',
    });
  }
});

// 🧠 LISTAR CONVERSACIONES AGRUPADAS POR TELÉFONO
app.get('/conversations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.phone,
        MAX(m.created_at) AS last_message_at,
        COUNT(*) AS total_messages,
        (
          SELECT m2.message
          FROM messages m2
          WHERE m2.phone = m.phone
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM messages m
      GROUP BY m.phone
      ORDER BY last_message_at DESC;
    `);

    const conversations = result.rows.map((row) => ({
      phone: row.phone,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      totalMessages: Number(row.total_messages),
      status: 'NUEVO',
      tags: [],
    }));

    res.json({
      status: 'ok',
      total: conversations.length,
      data: conversations,
    });
  } catch (err) {
    console.error('❌ Error al consultar conversaciones:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error al consultar conversaciones',
    });
  }
});

// ------------------ ARRANCAR SERVIDOR ------------------
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
