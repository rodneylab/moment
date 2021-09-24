import type { OpeningHoursRange, PostalAddress } from '.prisma/client';

export const address1: PostalAddress = {
  id: 1,
  createdAt: new Date('2021-09-24T14:21:14.000+0100'),
  updatedAt: new Date('2021-09-24T14:21:14.000+0100'),
  streetAddress: '16–18 Berners Street',
  locality: 'Fitzrovia',
  postalCode: 'W1T 3LN',
  city: 'London',
  country: 'United Kingdom',
};

export const openingHours1: OpeningHoursRange[] = [
  {
    id: 1,
    createdAt: new Date('2021-09-24T14:21:14.000+0100'),
    updatedAt: new Date('2021-09-24T14:21:14.000+0100'),
    startDay: 1,
    endDay: 5,
    openingTime: '09:00',
    closingTime: '17:00',
    openingHoursId: 1,
  },
  {
    id: 1,
    createdAt: new Date('2021-09-24T14:21:14.000+0100'),
    updatedAt: new Date('2021-09-24T14:21:14.000+0100'),
    startDay: 6,
    endDay: 6,
    openingTime: '10:00',
    closingTime: '18:00',
    openingHoursId: 1,
  },
];
