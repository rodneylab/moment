import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify';
// import { Server, IncomingMessage, ServerResponse  } from 'http';
import cors from 'fastify-cors';
const server: FastifyInstance = Fastify({});

server.register((cors), { origin: process.env.CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true]});

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
