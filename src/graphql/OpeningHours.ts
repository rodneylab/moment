import { nonNull, objectType } from 'nexus';

export const OpeningHoursRange = objectType({
  name: 'OpeningHoursRange',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.field('createdAt', { type: nonNull('Date') });
    t.nonNull.field('updatedAt', { type: nonNull('Date') });
    t.nonNull.int('startDay');
    t.nonNull.int('endDay');
    t.nonNull.string('openingTime');
    t.nonNull.string('closingTime');
  },
});

export const OpeningHours = objectType({
  name: 'OpeningHours',
  definition(t) {
    t.list.nonNull.field('openingHoursRanges', { type: nonNull('OpeningHoursRange') });
  },
});
