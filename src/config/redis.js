const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

const createRedisClient = () => {
  const client = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB) || 0,
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        logger.error('Redis server refused connection');
        return new Error('Redis server refused connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        logger.error('Redis retry time exhausted');
        return new Error('Redis retry time exhausted');
      }
      if (options.attempt > 10) {
        logger.error('Redis max retry attempts reached');
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    },
  });

  client.on('error', (error) => {
    logger.error('Redis Client Error:', error);
    isConnected = false;
  });

  client.on('connect', () => {
    logger.info('Redis Client Connected');
    isConnected = true;
  });

  client.on('ready', () => {
    logger.info('Redis Client Ready');
    isConnected = true;
  });

  client.on('end', () => {
    logger.warn('Redis Client Connection Ended');
    isConnected = false;
  });

  client.on('reconnecting', () => {
    logger.info('Redis Client Reconnecting...');
    isConnected = false;
  });

  return client;
};

const connectRedis = async () => {
  try {
    // Allow disabling Redis via env flag or missing host configuration
    if (process.env.REDIS_ENABLED === 'false' || !process.env.REDIS_HOST) {
      throw new Error('Redis disabled by configuration');
    }

    if (redisClient && isConnected) {
      logger.info('Redis already connected');
      return redisClient;
    }

    redisClient = createRedisClient();
    await redisClient.connect();

    logger.info(`Redis connected successfully to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    return redisClient;

  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

const disconnectRedis = async () => {
  try {
    if (redisClient && isConnected) {
      await redisClient.quit();
      isConnected = false;
      logger.info('Redis disconnected successfully');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient || !isConnected) {
    throw new Error('Redis client not connected');
  }
  return redisClient;
};

const getConnectionStatus = () => {
  return {
    isConnected,
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  };
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await disconnectRedis();
    process.exit(0);
  } catch (error) {
    logger.error('Error during Redis disconnection:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await disconnectRedis();
    process.exit(0);
  } catch (error) {
    logger.error('Error during Redis disconnection:', error);
    process.exit(1);
  }
});

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  getConnectionStatus,
};
