import type { PrismaClient } from '.prisma/client';
import type { FastifyInstance, FastifyRequest, Session } from 'fastify';

export interface Context {
  request: FastifyRequest & { session: Session & { userId: string } };
  // res: FastifyReply;
  prisma: PrismaClient;
  app: FastifyInstance;
}
