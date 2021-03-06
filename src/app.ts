import fastifyCookie from '@fastify/cookie';
import fastifyPostgres from '@fastify/postgres';
import fastifyRedis from '@fastify/redis';
import fastifySession from '@fastify/session';
import { PrismaClient } from '@prisma/client';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import ExhibitionResolver from './resolvers/exhibition';
import GalleryResolver from './resolvers/gallery';
import HelloResolver from './resolvers/hello';
import PhotographerResolver from './resolvers/photographer';
import TubeStationResolver from './resolvers/tubeStation';
import UserResolver from './resolvers/user';
import { isProduction } from './utilities/utilities';
if (!isProduction) {
  delete process.env.https_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.http_proxy;
  delete process.env.HTTP_PROXY;
  delete process.env._proxy;
}

import type { FastifyRedis } from '@fastify/redis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: FastifyRedis;
  }
}

function fastifyAppClosePlugin(app: FastifyInstance): ApolloServerPlugin {
  return {
    async serverWillStart() {
      return Promise.resolve({
        async drainServer() {
          await app.close();
        },
      });
    },
  };
}

const prisma = new PrismaClient();

export async function build(opts = { logger: true }): Promise<FastifyInstance> {
  const server: FastifyInstance = Fastify(opts);

  // server.register(fastifyCors, {
  //   origin: process.env.CORS_ORIGIN,
  //   methods: ['GET', 'POST'],
  //   credentials: true,
  // });

  await server.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL,
  });

  await server.register(fastifyCookie);
  await server.register(fastifyRedis, { host: '127.0.0.1' });
  await server.register(fastifySession, {
    secret: process.env.SESSION_SECRET as string,
    cookie: {
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 1_800_000,
      domain: isProduction && process.env.DOMAIN ? `.${process.env.DOMAIN}` : undefined,
    },
  });
  // const { redis } = server;

  // server.register(prismaPlugin);
  // await context.prisma.gallery.deleteMany({});
  // await prisma.tubeStation.deleteMany({});

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [
        ExhibitionResolver,
        GalleryResolver,
        HelloResolver,
        PhotographerResolver,
        TubeStationResolver,
        UserResolver,
      ],
      validate: false,
    }),
    plugins: [
      fastifyAppClosePlugin(server),
      ApolloServerPluginDrainHttpServer({ httpServer: server.server }),
    ],
    context: ({ request, reply }) => ({
      request,
      reply,
      prisma,
      app: server,
      // redis,
    }),
  });
  await apolloServer.start();
  await server.register(apolloServer.createHandler());
  await server.listen(4000);
  console.log(`Server ready at
  http://localhost:4000${apolloServer.graphqlPath}`);

  return server;
}

export default build;
