import { inputObjectType } from 'nexus';

export const AddressInput = inputObjectType({
  name: 'AddressInput',
  definition(t) {
    t.string('streetAddress');
    t.string('locality');
    t.string('city');
    t.string('postalCode');
    t.string('country');
  },
});
