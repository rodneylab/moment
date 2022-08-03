import { GraphQLDate } from 'graphql-scalars';
import { decorateType } from 'nexus';

export const GQLDate: typeof GraphQLDate = decorateType(GraphQLDate, {
  sourceType: 'Date',
  asNexusMethod: 'date',
});

export * from './Exhibition';
export * from './Gallery';
export * from './Hello';
export * from './Photographer';
