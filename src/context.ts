import type { PrismaClient } from '@prisma/client';
import type * as Fastify from 'fastify';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Request } from 'u2f';
import { db } from './db';

export interface Context {
  reply: FastifyReply;
  db: PrismaClient;
  app: FastifyInstance;
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
}

export const context = { db };
