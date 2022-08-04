import { nonNull, objectType } from 'nexus';

export const OpeningHoursRange = objectType({
  name: 'OpeningHoursRange',
  definition(t) {
    t.nonNull.int('id');
    t.field('createdAt', { type: nonNull('Date') });
    t.field('updatedAt', { type: nonNull('Date') });
    t.string('startDay');
    t.string('endDay');
    t.string('openingTime');
    t.string('closingTime');
  },
});

export const OpeningHours = objectType({
  name: 'OpeningHours',
  definition(t) {
    t.nonNull.list.nonNull.field('openingHoursRanges', { type: nonNull('OpeningHoursRange') });
  },
});
