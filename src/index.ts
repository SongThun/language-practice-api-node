import Fastify from 'fastify';
import { loadConfig } from './config';
import corsPlugin from './plugins/cors';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import healthRoutes from './routes/health';
import wordRoutes from './routes/words';
import tagRoutes from './routes/tags';
import practiceRoutes from './routes/practice';

export async function buildApp(opts?: { logger?: boolean }) {
  const app = Fastify({
    logger: opts?.logger ?? true,
  });

  // Register plugins
  await app.register(corsPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  // Register routes
  await app.register(healthRoutes);
  await app.register(wordRoutes, { prefix: '/words' });
  await app.register(tagRoutes, { prefix: '/tags' });
  await app.register(practiceRoutes, { prefix: '/practice' });

  return app;
}

async function start() {
  const config = loadConfig();
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Server listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
