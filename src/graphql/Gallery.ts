import { objectType } from 'nexus';

export const Gallery = objectType({
  name: 'Gallery',
  definition(t) {
    t.nonNull.string('id');
  },
});
