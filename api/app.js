import express from 'express';
import app from '../src/server.js';

const wrapper = express();
wrapper.use((req, _res, next) => {
  req.url = req.url.replace(/^\/api\/app/, '');
  next();
});
wrapper.use(app);

export default function handler(req, res) {
  return wrapper(req, res);
}