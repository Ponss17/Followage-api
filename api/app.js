import serverless from 'serverless-http';
import app from '../src/server.js';

export default serverless(app);