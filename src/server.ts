import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify';
// import { Server, IncomingMessage, ServerResponse  } from 'http';
import fastifyCors from 'fastify-cors';
import fastifyPostgres from 'fastify-postgres';
import fastifySession from '@fastify/session';
import fastifyCookie from 'fastify-cookie';

const server: FastifyInstance = Fastify({});

server.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true,
});
server.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
});
server.register(fastifyCookie);
server.register(fastifySession, { secret: process.env.SESSION_SECRET as string });

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          pong: {
            type: 'string',
          },
        },
      },
    },
  },
};

server.get('/ping', opts, async (_request, _reply) => {
  return { pong: 'it worked!' };
});

// const fastify = require('fastify')({logger: true})

// fastify.get('/', async(request, reply) => {
//   return { hello: 'you!'}
// });

const start = async () => {
  try {
    await server.listen(4000);

    // const address = server.server.address();
    // const port = typeof address === 'string' ? address : address?.port;
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
