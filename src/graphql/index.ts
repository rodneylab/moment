import { GraphQLDate } from 'graphql-scalars';
import { decorateType } from 'nexus';

export const GQLDate: typeof GraphQLDate = decorateType(GraphQLDate, {
  sourceType: 'Date',
  asNexusMethod: 'date',
});

export * from './AddressInput';
export * from './Exhibition';
export * from './Gallery';
export * from './Hello';
export * from './OpeningHours';
export * from './Photographer';
export * from './PostalAddress';
export * from './TubeStation';
