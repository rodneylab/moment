import type { PrismaClient } from '.prisma/client';
import type * as Fastify from 'fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type FidoU2FRegisterRequest from './resolvers/FidoU2fRegisterRequest';
import FidoU2fSignRequest from './resolvers/FidoU2fSignRequest';

export interface Context {
  request: FastifyRequest & {
    session: Fastify.Session & {
      user: {
        userId: string;
        mfaAuthenticated: boolean;
        fidoU2f?: {
          registerRequests?: FidoU2FRegisterRequest[];
          signRequests?: FidoU2fSignRequest[];
        };
      };
    };
  };
  reply: FastifyReply;
  prisma: PrismaClient;
  app: FastifyInstance;
}
