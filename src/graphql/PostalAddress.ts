import { nonNull, objectType } from 'nexus';

export const PostalAddress = objectType({
  name: 'PostalAddress',
  definition(t) {
    t.nonNull.int('id');
    t.field('createdAt', { type: nonNull('Date') });
    t.field('updatedAt', { type: nonNull('Date') });
    t.string('streetAddress');
    t.string('locality');
    t.string('city');
    t.string('postalCode');
    t.string('country');
  },
});
