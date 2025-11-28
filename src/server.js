// src/server.js
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 Middlewares
app.use(cors());
app.use(express.json()); // Para leer JSON del body

// ✅ Endpoint de salud
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nexus backend activo 💥',
  });
});

// 📩 Endpoint que n8n va a llamar
// URL en Render: https://TU-APP.onrender.com/webhook/whatsapp
app.post('/webhook/whatsapp', (req, res) => {
  try {
    const { phone, message } = req.body;

    // Validación básica
    if (!phone || !message) {
      console.log('❌ Faltan campos en el body:', req.body);
      return res.status(400).json({
        status: 'error',
        message: 'Faltan campos: phone o message',
      });
    }

    console.log('📲 Mensaje recibido desde n8n:', {
      phone,
      message,
      rawBody: req.body,
    });

    // Aquí después puedes:
    // - Guardar en DB
    // - Enviar a otro servicio
    // - Llamar a la IA, etc.

    return res.json({
      status: 'ok',
      received: true,
    });
  } catch (error) {
    console.error('❌ Error en /webhook/whatsapp:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno en el webhook',
    });
  }
});

// 404 para rutas que no existan
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada',
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('💥 Error no controlado:', err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
  });
});

// 🚀 Arrancar servidor
app.listen(PORT, () => {
  console.log(`🔥 Nexus backend escuchando en el puerto ${PORT}`);
});

