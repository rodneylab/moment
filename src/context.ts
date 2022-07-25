import type { PrismaClient } from '@prisma/client';
import type * as Fastify from 'fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Request } from 'u2f';

export interface Context {
  request: FastifyRequest & {
    session: Fastify.Session & {
      user: {
        userId: string;
        mfaAuthenticated: boolean;
        fidoU2f?: {
          registerRequests?: Request[];
          signRequests?: Request[];
        };
      };
    };
  };
  reply: FastifyReply;
  prisma: PrismaClient;
  app: FastifyInstance;
}
