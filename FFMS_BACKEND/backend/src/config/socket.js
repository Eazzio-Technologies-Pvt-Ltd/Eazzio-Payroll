const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { accessTokenSecret } = require('./jwt');
const prisma = require('./prisma');
const logger = require('./logger');
let io = null;

const { isOriginAllowed } = require('./cors');

const _checkOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }
  return callback(new Error('CORS blocked: ' + origin));
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: _checkOrigin,
      credentials: true,
      methods: ['GET', 'POST']
    },
    // Prevent reconnect storms when the client drops (e.g. CORS error burst).
    // Client-side should also set reconnectionAttempts: 5.
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // ─── Authentication Middleware ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    let decoded;
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token is required'));
      }

      decoded = jwt.verify(token, accessTokenSecret);
    } catch (err) {
      logger.error('Socket token verification failed:', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('Authentication error: User not active'));
      }

      // Attach user details to socket
      socket.user = {
        id: user.id,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      };

      next();
    } catch (err) {
      logger.error('Socket DB authentication failed:', err.message);
      next(new Error('Database error: Unable to connect'));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { id, name, role, organizationId } = socket.user;

    logger.info(`Socket connected: ${name} (${role}) - Socket ID: ${socket.id}`);

    // Join direct user room
    socket.join(`user:${id}`);

    if (['ADMIN', 'MANAGER'].includes(role)) {
      socket.join(`org:${organizationId}:admins`);
      logger.info(`User ${name} joined org:${organizationId}:admins room`);
    } else if (role === 'FIELD_STAFF' || role === 'OFFICE_STAFF') {
      io.to(`org:${organizationId}:admins`).emit('staff:online', {
        userId: id,
        name,
        socketId: socket.id,
      });
      logger.info(`Staff ${name} is online. Emitted staff:online to admins.`);
    }

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${name} - Socket ID: ${socket.id}`);

      if (role === 'FIELD_STAFF' || role === 'OFFICE_STAFF') {
        io.to(`org:${organizationId}:admins`).emit('staff:offline', {
          userId: id,
          name,
        });
        logger.info(`Staff ${name} went offline. Emitted staff:offline to admins.`);
      }
    });
  });

  return io;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
};

const emitToOrgAdmins = (organizationId, eventName, data) => {
  if (io) {
    io.to(`org:${organizationId}:admins`).emit(eventName, data);
  }
};

const emitToUser = (userId, eventName, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(eventName, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToOrgAdmins,
  emitToUser,
};
