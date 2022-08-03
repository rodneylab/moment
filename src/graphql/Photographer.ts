import { nonNull, objectType } from 'nexus';
import { Exhibition } from './Exhibition';

export const Photographer = objectType({
  name: 'Photographer',
  definition(t) {
    t.nonNull.int('id');
    t.field('createdAt', { type: nonNull('Date') });
    t.field('updatedAt', { type: nonNull('Date') });
    t.string('firstName');
    t.string('lastName');
    t.string('otherNames');
    t.string('name');
    t.nonNull.string('slug');
    t.list.nonNull.field('exhibitions', { type: Exhibition });
    t.string('website');
    t.string('websiteUrl');
  },
});
