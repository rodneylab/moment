import { OpeningHoursRange, PostalAddress } from '.prisma/client';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const N_DASH_ENTITY = '\u2013';

export function addressStringFromPostalAddress(postalAddress: PostalAddress) {
  const { streetAddress, locality, postalCode } = postalAddress;
  return [streetAddress, locality, postalCode].filter((element) => element).join(', ');
}

export function graphqlOpeningHoursFromOpeningHours(openingHoursRanges: OpeningHoursRange[]) {
  return {
    openingHoursRanges: openingHoursRanges.map((element) => {
      const { closingTime, createdAt, endDay, id, openingTime, startDay, updatedAt } = element;
      return {
        id,
        createdAt,
        updatedAt,
        startDay,
        endDay,
        openingTime,
        closingTime,
      };
    }),
  };
}

export function openingTimesFromOpeningHours(openingHoursRanges: OpeningHoursRange[]) {
  return openingHoursRanges
    .map((element: OpeningHoursRange) => {
      const { closingTime, endDay, openingTime, startDay } = element;
      return startDay === endDay
        ? `${DAYS[startDay]}s ${openingTime}${N_DASH_ENTITY}${closingTime}`
        : `${DAYS[startDay]} to ${DAYS[endDay]} ${openingTime}${N_DASH_ENTITY}${closingTime}`;
    })
    .join(', ');
}
