const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/error.middleware');
const auditLogger = require('./middleware/audit.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const v1Router = require('./routes/v1');

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

const { isOriginAllowed, allowedOrigins } = require('./config/cors');

// ─── Express CORS ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(auditLogger);
app.use('/api/', apiLimiter);

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/v1/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', v1Router);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = app;
module.exports.isOriginAllowed = isOriginAllowed; // used by config/socket.js
module.exports.allowedOrigins = allowedOrigins;   // used for debugging if needed
