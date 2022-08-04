import { nonNull, objectType } from 'nexus';

export const TubeStation = objectType({
  name: 'TubeStation',
  definition(t) {
    t.nonNull.int('id');
    t.field('createdAt', { type: nonNull('Date') });
    t.field('updatedAt', { type: nonNull('Date') });
    t.nonNull.string('name');
    t.nonNull.string('slug');
    t.nonNull.list.nonNull.field('galleries', { type: nonNull('Gallery') });
  },
});
