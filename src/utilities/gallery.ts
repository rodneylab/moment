import type { OpeningHoursRange, PostalAddress } from '.prisma/client';
import { Exhibition, Gallery, GalleryTubeStations, Location, OpeningHours } from '.prisma/client';
import { TubeStation } from '@prisma/client';
import GraphQLGallery from '../entities/Gallery';
import type AddressInput from '../resolvers/AddressInput';
import type FieldError from '../resolvers/FieldError';
import type { OpeningHoursInput } from '../resolvers/gallery';

export type DatabaseGallery = Gallery & {
  exhibitions: Exhibition[];
  nearestTubes: (GalleryTubeStations & {
    tubeStation: TubeStation;
  })[];
  address: PostalAddress | null;
  location: Location | null;
  openingHours:
    | (OpeningHours & {
        openingHoursRanges: OpeningHoursRange[];
      })
    | null;
  byAppointmentOpeningHours:
    | (OpeningHours & {
        openingHoursRanges: OpeningHoursRange[];
      })
    | null;
};

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const N_DASH_ENTITY = '\u2013';

export function addressStringFromPostalAddress(postalAddress: PostalAddress) {
  const { streetAddress, locality, postalCode } = postalAddress;
  return [streetAddress, locality, postalCode].filter((element) => element).join(', ');
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
  if (/[\0\n\f\v\r\t]/.test(name)) {
    result.push({ field: fieldName, message: `${fieldName} contains invalid characters` });
  }
  return result;
}

export function validOpeningHours(openingHours: OpeningHoursInput): FieldError[] {
  const result: FieldError[] = [];
  openingHours.openingHoursRanges.forEach((element, index) => {
    const { startDay, endDay, openingTime, closingTime } = element;

    let errorsFoundOnThisElement = false;
    const openingHour = parseInt(openingTime.slice(0, 2), 10);
    const openingMinute = parseInt(openingTime.slice(3, 5), 10);
    const openingDate = new Date('2000');
    openingDate.setHours(openingHour);
    openingDate.setMinutes(openingMinute);

    const closingHour = parseInt(closingTime.slice(0, 2), 10);
    const closingMinute = parseInt(closingTime.slice(3, 5), 10);
    const closingDate = new Date('2000');
    closingDate.setHours(closingHour);
    closingDate.setMinutes(closingMinute);

    // test openingTime is in 18:30 format
    if (!/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(openingTime)) {
      result.push({ field: `openingTime${index}`, message: `Check time is in 18:30 format` });
    }

    // test closingTime is in 18:30 format
    if (!/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(closingTime)) {
      result.push({ field: `closingTime${index}`, message: `Check time is in 18:30 format` });
    }

    if (!errorsFoundOnThisElement && closingDate < openingDate) {
      result.push({
        field: `openingTime${index}`,
        message: 'Check opening time is earlier than closing time',
      });
      result.push({
        field: `closingTime${index}`,
        message: 'Check opening time is earlier than closing time',
      });
    }

    if (startDay < 0 || startDay > 6) {
      result.push({
        field: `startDay${index}`,
        message: 'Check this is a valid day',
      });
    }

    if (endDay < 0 || endDay > 6) {
      result.push({
        field: `endDay${index}`,
        message: 'Check this is a valid day',
      });
    }

    if (
      endDay < startDay ||
      (index > 0 && startDay <= openingHours.openingHoursRanges[index - 1].endDay)
    ) {
      result.push({
        field: `startDay${index}`,
        message: 'Check days are in sequence, if Sunday is included, it should come first',
      });
      result.push({
        field: `endDay${index}`,
        message: 'Check days are in sequence, if Sunday is included, it should come first',
      });
    }
  });

  return result;
}

// https://www.openstreetmap.org/#map=15/46.2926/7.8782

export function geoCordinatesFromOpenMapUrl(url: string) {
  const startIndex = url.indexOf('#map');
  const [_, latitude, longitude] = url.slice(startIndex + 5).split('/');
  return {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
  };
}

export function validOpenMapUrl(url: string) {
  const result: FieldError[] = [];
  const openMapRegex = /^https:\/\/www\.openstreetmap\.org\/#map=\d+\/-?\d+\.\d+\/-?\d+\.\d+$/;
  if (!openMapRegex.test(url)) {
    result.push({ field: 'openStreetMap', message: 'Check the map URL' });
  }
  return result;
}

export function graphqlGallery(gallery: DatabaseGallery): GraphQLGallery {
  const {
    uid,
    createdAt,
    updatedAt,
    name,
    slug,
    exhibitions,
    address,
    location,
    openingHours,
    byAppointmentOpeningHours,
    nearestTubes,
    website,
  } = gallery;

  const graphqlTubeStations = nearestTubes.map((element) => {
    const { createdAt, name, slug, updatedAt, uid: id } = element.tubeStation;
    return { id, createdAt, name, slug, updatedAt };
  });

  const graphqlOpeningHours = {
    openingHoursRanges: openingHours?.openingHoursRanges.map((element) => {
      const { id, createdAt, updatedAt, startDay, endDay, openingTime, closingTime } = element;
      return { id, createdAt, updatedAt, startDay, endDay, openingTime, closingTime };
    }),
  };

  const graphqlByAppointmentOpeningHours = {
    openingHoursRanges: byAppointmentOpeningHours?.openingHoursRanges.map((element) => {
      const { id, createdAt, updatedAt, startDay, endDay, openingTime, closingTime } = element;
      return { id, createdAt, updatedAt, startDay, endDay, openingTime, closingTime };
    }),
  };

  const graphqlExhibitions = exhibitions.map((element) => {
    const {
      uid: id,
      createdAt,
      updatedAt,
      name,
      description,
      summaryText,
      hashtags,
      start,
      end,
      freeEntry,
      online,
      inPerson,
    } = element;
    return {
      id,
      createdAt,
      updatedAt,
      name,
      description,
      summaryText,
      hashtags,
      start: start?.toUTCString(),
      end: end?.toUTCString(),
      freeEntry,
      online,
      inPerson,
    };
  });

  return {
    id: uid,
    createdAt,
    updatedAt,
    name,
    slug,
    address: address ? addressStringFromPostalAddress(address) : null,
    postalAddress: address,
    location: location ? location : null,
    openStreetMap: location
      ? `https://www.openstreetmap.org/#map=19/${location.latitude}/${location.longitude}`
      : null,
    openingTimes: openingHours
      ? openingTimesFromOpeningHours(openingHours?.openingHoursRanges)
      : null,
    byAppointmentOpeningTimes: byAppointmentOpeningHours
      ? openingTimesFromOpeningHours(byAppointmentOpeningHours?.openingHoursRanges)
      : null,
    openingHours: graphqlOpeningHours,
    byAppointmentOpeningHours: graphqlByAppointmentOpeningHours,
    exhibitions: graphqlExhibitions,
    nearestTubes: graphqlTubeStations,
    tubes: graphqlTubeStations.map((element) => element.name).join(', '),
    website: website ? new URL(website).hostname : null,
    websiteUrl: website,
  };
}

export function sortGalleries(galleries: DatabaseGallery[]): DatabaseGallery[] {
  return galleries.sort((a, b) =>
    a.name.replace(/^The /i, '') > b.name.replace(/^The /i, '') ? 1 : -1,
  );
}

export function validPostalAddress(address: AddressInput) {
  const errors: FieldError[] = [];
  const { city, country, locality, postalCode, streetAddress } = address;

  errors.push(...validName(streetAddress, 'Street Address'));
  errors.push(...validName(locality, 'Locality'));
  errors.push(...validName(city, 'City'));

  if (postalCode) {
    const ukPostalCodeRegex =
      /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/;
    if (!ukPostalCodeRegex.test(postalCode)) {
      errors.push({ field: 'Postal Code', message: 'Check the postal code is correct' });
    }
  }
  errors.push(...validName(country, 'Country'));
  return errors;
}
