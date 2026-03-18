import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import * as jose from 'jose';
import { loadConfig } from '../config';

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  const config = loadConfig();
  const jwksUrl = new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`);
  const JWKS = jose.createRemoteJWKSet(jwksUrl);

  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer: `${config.supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });

      const sub = payload.sub;
      if (!sub) {
        reply.code(401).send({ error: 'Invalid token: missing subject' });
        return;
      }

      request.userId = sub;
    } catch {
      reply.code(401).send({ error: 'Invalid or expired token' });
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(authPlugin, {
  name: 'auth',
});
