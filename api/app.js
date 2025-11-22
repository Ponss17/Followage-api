import serverless from 'serverless-http';
import express from 'express';
import app from '../src/server.js';

// Envuelve Express y elimina el prefijo /api/app de la URL
const wrapper = express();
wrapper.use((req, _res, next) => {
  req.url = req.url.replace(/^\/api\/app/, '');
  next();
});
wrapper.use(app);

export default serverless(wrapper);