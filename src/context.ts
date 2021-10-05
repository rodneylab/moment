import type { PrismaClient } from '.prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest, Session } from 'fastify';
import type FidoU2FRequest from './resolvers/FidoU2fRequest';

export interface Context {
  request: FastifyRequest & {
    session: Session & { userId: string; mfaAuthenticated: boolean } & {
      user: {
        fidoU2F: { request: FidoU2FRequest };
      };
    };
  };
  reply: FastifyReply;
  prisma: PrismaClient;
  app: FastifyInstance;
}
