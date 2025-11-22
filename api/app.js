import express from 'express';
import app from '../src/server.js';

// Quitar el prefijo /api/app de la URL antes de delegar a Express
const wrapper = express();
wrapper.use((req, _res, next) => {
  req.url = req.url.replace(/^\/api\/app/, '');
  next();
});
wrapper.use(app);

// Exporta el handler compatible con Vercel (req, res)
export default function handler(req, res) {
  return wrapper(req, res);
}