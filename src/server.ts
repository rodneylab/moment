import { PrismaClient } from '.prisma/client';
import fastifySession from '@fastify/session';
// import { createClient } from '@supabase/supabase-js';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from 'fastify-cookie';
// import { Server, IncomingMessage, ServerResponse  } from 'http';
// import fastifyCors from 'fastify-cors';
import fastifyPostgres from 'fastify-postgres';
import fastifyRedis from 'fastify-redis';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { GalleryResolver } from './resolvers/gallery';
import HelloResolver from './resolvers/hello';
import TubeStationResolver from './resolvers/tubeStation';
import UserResolver from './resolvers/user';
import { isProduction } from './utilities/utilities';

function fastifyAppClosePlugin(app: FastifyInstance): ApolloServerPlugin {
  return {
    async serverWillStart() {
      return {
        async drainServer() {
          await app.close();
        },
      };
    },
  };
}

const prisma = new PrismaClient();
// const supabase = createClient(
//   process.env.SUPABASE_URL as string,
//   process.env.SUPABASE_KEY as string,
// );

async function startApolloServer() {
  const server: FastifyInstance = Fastify();

  // server.register(fastifyCors, {
  //   origin: process.env.CORS_ORIGIN,
  //   methods: ['GET', 'POST'],
  //   credentials: true,
  // });
  server.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL,
  });
  server.register(fastifyCookie);
  server.register(fastifyRedis, { host: '127.0.0.1' });
  server.register(fastifySession, {
    secret: process.env.SESSION_SECRET as string,
    cookie: {
      secure: isProduction,
      sameSite: 'Lax',
      maxAge: 1_800_000,
      domain: isProduction ? `.${process.env.DOMAIN}` : undefined,
    },
  });
  server.addHook('preHandler', (request, _, next) => {
    const session = request.session;
    request.sessionStore.destroy(session.sessionId, next);
  });
  const { redis } = server;

  // server.register(prismaPlugin);

  // await context.prisma.gallery.deleteMany({});
  // await prisma.tubeStation.deleteMany({});

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [GalleryResolver, HelloResolver, TubeStationResolver, UserResolver],
      validate: false,
    }),
    plugins: [
      fastifyAppClosePlugin(server),
      ApolloServerPluginDrainHttpServer({ httpServer: server.server }),
    ],
    context: async ({ request }) => ({
      request,
      prisma,
      app: server,
      redis,
    }),
  });
  await apolloServer.start();
  server.register(apolloServer.createHandler());
  await server.listen(4000);
  console.log(`Server ready at
  http://localhost:4000${apolloServer.graphqlPath}`);
}

startApolloServer();
