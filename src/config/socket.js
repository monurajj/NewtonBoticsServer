const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

const setupSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const cleanToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      
      socket.userId = decoded.sub;
      socket.userRole = decoded.role;
      socket.userEmail = decoded.email;
      
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`User ${socket.userId} (${socket.userEmail}) connected to Socket.IO`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Join user to role-based rooms
    socket.join(`role:${socket.userRole}`);

    // Handle user joining specific project
    socket.on('project:subscribe', (projectId) => {
      socket.join(`project:${projectId}`);
      logger.info(`User ${socket.userId} subscribed to project ${projectId}`);
    });

    // Handle user leaving specific project
    socket.on('project:unsubscribe', (projectId) => {
      socket.leave(`project:${projectId}`);
      logger.info(`User ${socket.userId} unsubscribed from project ${projectId}`);
    });

    // Handle workshop subscription
    socket.on('workshop:subscribe', (workshopId) => {
      socket.join(`workshop:${workshopId}`);
      logger.info(`User ${socket.userId} subscribed to workshop ${workshopId}`);
    });

    // Handle inventory subscription
    socket.on('inventory:subscribe', () => {
      socket.join('inventory:updates');
      logger.info(`User ${socket.userId} subscribed to inventory updates`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User ${socket.userId} disconnected: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  logger.info('Socket.IO server initialized');
};

// Emit functions for different events
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
    logger.debug(`Emitted ${event} to user ${userId}`);
  }
};

const emitToProject = (projectId, event, data) => {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
    logger.debug(`Emitted ${event} to project ${projectId}`);
  }
};

const emitToWorkshop = (workshopId, event, data) => {
  if (io) {
    io.to(`workshop:${workshopId}`).emit(event, data);
    logger.debug(`Emitted ${event} to workshop ${workshopId}`);
  }
};

const emitToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
    logger.debug(`Emitted ${event} to role ${role}`);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
    logger.debug(`Emitted ${event} to all connected clients`);
  }
};

const emitToInventory = (event, data) => {
  if (io) {
    io.to('inventory:updates').emit(event, data);
    logger.debug(`Emitted ${event} to inventory subscribers`);
  }
};

// Get connected users count
const getConnectedUsersCount = () => {
  if (io) {
    return io.engine.clientsCount;
  }
  return 0;
};

// Get socket instance
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  setupSocketIO,
  emitToUser,
  emitToProject,
  emitToWorkshop,
  emitToRole,
  emitToAll,
  emitToInventory,
  getConnectedUsersCount,
  getIO,
};
