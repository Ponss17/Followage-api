import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { readAuth } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import followageRoutes from './routes/followage.js';
import clipsRoutes from './routes/clips.js';
import generalRoutes from './routes/general.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const dur = Date.now() - start;
    const path = req.originalUrl || req.url;
    console.log(`[metrics] ${req.method} ${path} -> ${res.statusCode} in ${dur}ms`);
  });
  next();
});

app.set('trust proxy', 1);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(readAuth);

app.use('/auth', authRoutes);
app.use(followageRoutes);
app.use(clipsRoutes);
app.use(generalRoutes);

app.use(express.static(publicDir));
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.get('/error', (_req, res) => {
  res.sendFile(path.join(publicDir, 'error.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.set('Cache-Control', 'no-store');
  res.status(status).json({ error: true, message });
});

export default app;

const isServerless =
  process.env.NETLIFY === 'true' ||
  process.env.LAMBDA_TASK_ROOT != null ||
  process.env.VERCEL === '1';

if (!isServerless) {
  app.listen(port, () => {
    console.log(`Followage API escuchando en http://localhost:${port}`);
  });
}