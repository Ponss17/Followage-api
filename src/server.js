import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFollowageText, getFollowageJson } from './twitch.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Static landing page and assets
app.use(express.static(publicDir));
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/api/followage', async (req, res) => {
  const viewer = (req.query.touser || req.query.user || '').toString().trim();
  const channel = (req.query.channel || req.query.to || '').toString().trim();
  const format = (req.query.format || 'text').toString().trim();
  const lang = (req.query.lang || 'es').toString().trim();

  if (!viewer || !channel) {
    return res.status(400).json({
      error: 'Parámetros inválidos',
      message: 'Se requieren "touser" (viewer) y "channel" (broadcaster)'
    });
  }

  try {
    if (format === 'json') {
      const data = await getFollowageJson({ viewer, channel });
      return res.json(data);
    } else {
      const text = await getFollowageText({ viewer, channel, lang });
      return res.send(text);
    }
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: 'followage_error', message: err?.message || 'Error inesperado' });
  }
});

app.get('/twitch/followage/:viewer/:channel', async (req, res) => {
  const { viewer, channel } = req.params;
  const lang = (req.query.lang || 'es').toString().trim();
  try {
    const text = await getFollowageText({ viewer, channel, lang });
    return res.send(text);
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: 'followage_error', message: err?.message || 'Error inesperado' });
  }
});

app.listen(port, () => {
  console.log(`Followage API escuchando en http://localhost:${port}`);
});