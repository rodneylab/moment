import type { PrismaClient } from '.prisma/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest, Session } from 'fastify';

export interface Context {
  req: FastifyRequest & { session: Session & { userId: string } };
  res: FastifyReply;
  prisma: PrismaClient;
  supabase: SupabaseClient;
}
