import type { OpeningHoursRange, PostalAddress } from '.prisma/client';
import type FieldError from 'src/resolvers/FieldError';
import type AddressInput from '../resolvers/AddressInput';

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

export function validName(name: string, fieldName: string): FieldError[] {
  const result: FieldError[] = [];
  if (/[\0\n\f\v\n\r\t]/.test(name)) {
    result.push({ field: fieldName, message: `${fieldName} contains invalid characters` });
  }
  return result;
}

export function validPostalAddress(address: AddressInput) {
  const errors: FieldError[] = [];
  const { city, country, locality, postalCode, streetAddress } = address;
  errors.push(...validName(streetAddress, 'Street Address'));
  errors.push(...validName(locality, 'Locality'));
  errors.push(...validName(city, 'City'));

  const ukPostalCodeRegex =
    /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/;
  if (!ukPostalCodeRegex.test(postalCode)) {
    errors.push({ field: 'Postal Code', message: 'Check the postal code is correct' });
  }

  errors.push(...validName(country, 'Country'));
  return errors;
}

export function validUrl(url: string, field: string) {
  const result: FieldError[] = [];
  const urlRegex =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  if (!urlRegex.test(url)) {
    result.push({ field, message: 'Check this is a valid url' });
  }
  return result;
}
