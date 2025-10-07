import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { connectToDb } from './db/connect.js';
import booksRouter from './routes/books.js';
import authorsRouter from './routes/authors.js';
import { serveSwagger, setupSwagger, swaggerSpec } from './swagger.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', 1);

// Boot diagnostics
console.log('🔧 Boot vars:', {
  hasUri: !!process.env.MONGODB_URI,
  db: process.env.DB_NAME,
  port: PORT
});
for (const key of ['MONGODB_URI', 'DB_NAME']) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: false
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Health & root
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/', (_req, res) => res.send('Library API is up'));

// Routes
app.use('/books', booksRouter);
app.use('/authors', authorsRouter);

// Swagger
app.use('/api-docs', serveSwagger, setupSwagger);
app.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 404
app.use((req, res) => res.status(404).json({ message: 'Not Found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: err.expose ? err.message : 'Internal Server Error'
  });
});

// Start
const start = async () => {
  try {
    await connectToDb(process.env.MONGODB_URI, process.env.DB_NAME);
    app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
