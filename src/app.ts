import fastifyCookie from '@fastify/cookie';
import fastifyRedis from '@fastify/redis';
import fastifySession from '@fastify/session';
import 'dotenv/config';
import Fastify, { FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import mercurius from 'mercurius';
import 'reflect-metadata';
import { context } from './context';
import { schema } from './schema';
import { isProduction } from './utilities/utilities';

if (!isProduction) {
  delete process.env.https_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.http_proxy;
  delete process.env.HTTP_PROXY;
  delete process.env._proxy;
}

const buildContext = async (request: FastifyRequest) => {
  const { db } = context;
  return Promise.resolve({
    authorization: request.headers.authorization,
    db,
    session: request.session,
  });
};

let app: FastifyInstance | null = null;

async function build(options: FastifyServerOptions = { logger: false }) {
  try {
    app = Fastify(options);
    app.get('/', async function (_req, reply) {
      return reply.graphql('{}');
    });

    await app.register(fastifyCookie);
    await app.register(fastifyRedis, { host: '127.0.0.1' });
    await app.register(fastifySession, {
      secret: process.env.SESSION_SECRET as string,
      cookie: {
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1_800_000,
        domain: isProduction && process.env.DOMAIN ? `.${process.env.DOMAIN}` : undefined,
      },
    });

    await app.register(mercurius, {
      schema,
      context: buildContext,
      graphiql: true,
    });

    return app;
  } catch (error) {
    app?.log.error(error);
    process.exit(1);
  }
}

export default build;
