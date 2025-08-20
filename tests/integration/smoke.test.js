const request = require('supertest');

let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.REDIS_ENABLED = 'false';
  process.env.JWT_SECRET = 'test-secret';
  // Use an in-memory or dummy Mongo for smoke tests if available; here rely on env MONGODB_URI
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/newtonbotics_test';

  app = require('../../src/server');
});

describe('Smoke: core routes', () => {
  it('GET /health should return OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });

  it('GET /api/projects placeholder should respond', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/workshops placeholder should respond', async () => {
    const res = await request(app).get('/api/workshops');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/events placeholder should respond', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/inventory placeholder should respond', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/news placeholder should respond', async () => {
    const res = await request(app).get('/api/news');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/media placeholder should respond', async () => {
    const res = await request(app).get('/api/media');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/contact placeholder should respond', async () => {
    const res = await request(app).get('/api/contact');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/messages placeholder should respond', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});


