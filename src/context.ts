import type { PrismaClient } from '.prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest, Session } from 'fastify';

export interface Context {
  request: FastifyRequest & { session: Session & { userId: string; mfaAuthenticated: boolean } };
  reply: FastifyReply;
  prisma: PrismaClient;
  app: FastifyInstance;
}
