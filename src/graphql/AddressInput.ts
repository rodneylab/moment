import { inputObjectType } from 'nexus';

export const AddressInput = inputObjectType({
  name: 'AddressInput',
  definition(t) {
    t.nonNull.string('streetAddress');
    t.nonNull.string('locality');
    t.nonNull.string('city');
    t.nonNull.string('postalCode');
    t.nonNull.string('country');
  },
});
