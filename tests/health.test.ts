import Fastify from 'fastify';
import healthRoutes from '../src/routes/health';

describe('GET /health', () => {
  it('returns status ok', async () => {
    const app = Fastify();
    await app.register(healthRoutes);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();

    await app.close();
  });
});
