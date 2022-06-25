import { Exhibition, Photographer } from '@prisma/client';
import FieldError from 'src/resolvers/FieldError';
import GraphQLPhotographer from '../entities/Photographer';

export type DatabasePhotographer = Photographer & {
  exhibitions: Exhibition[];
};

export function getFullName({
  firstName,
  otherNames,
  lastName,
}: {
  firstName?: string;
  otherNames?: string;
  lastName?: string;
}): string {
  return [
    ...(firstName ? [firstName] : []),
    ...(otherNames ? [otherNames] : []),
    ...(lastName ? [lastName] : []),
  ].join(' ');
}

export function graphqlPhotographer(photographer: DatabasePhotographer): GraphQLPhotographer {
  const { uid, createdAt, updatedAt, firstName, lastName, otherNames, slug, exhibitions, website } =
    photographer;

  const graphqlExhibitions = exhibitions.map((element) => {
    const {
      uid: id,
      createdAt: exhibitionCreatedAt,
      updatedAt: exhibitionUpdatedAt,
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
      createdAt: exhibitionCreatedAt,
      updatedAt: exhibitionUpdatedAt,
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
    firstName,
    otherNames,
    lastName,
    name: getFullName({
      ...(firstName ? { firstName } : {}),
      ...(otherNames ? { otherNames } : {}),
      ...(lastName ? { lastName } : {}),
    }),
    slug,
    exhibitions: graphqlExhibitions,
    website: website ? new URL(website).hostname : null,
    websiteUrl: website,
  };
}

export function sortPhotographers(photographers: DatabasePhotographer[]): DatabasePhotographer[] {
  return photographers.sort((a, b) => {
    const aPrimaryComparand =
      a.lastName ??
      [...(a.firstName ? [a.firstName] : []), a.otherNames ? [a.otherNames] : []].join(' ');
    const bPrimaryComparand =
      b.lastName ??
      [...(b.firstName ? [b.firstName] : []), b.otherNames ? [b.otherNames] : []].join(' ');

    if (aPrimaryComparand < bPrimaryComparand) {
      return -1;
    }
    if (aPrimaryComparand > bPrimaryComparand) {
      return 1;
    }
    // primary comperands are equivalent
    const aSecondaryComparand = a.lastName
      ? [...(a.firstName ? [a.firstName] : []), a.otherNames ? [a.otherNames] : []].join(' ')
      : null;

    const bSecondaryComparand = b.lastName
      ? [...(b.firstName ? [b.firstName] : []), b.otherNames ? [b.otherNames] : []].join(' ')
      : null;

    if (aSecondaryComparand && bSecondaryComparand) {
      return aSecondaryComparand.localeCompare(bSecondaryComparand);
    }
    if (!aSecondaryComparand && bSecondaryComparand) {
      return -1;
    }
    if (aSecondaryComparand && !bSecondaryComparand) {
      return 1;
    }
    // neither a nor b has a secondary comperand
    return 0;
  });
}

export function validFullName({
  firstName,
  otherNames,
  lastName,
}: {
  firstName?: string;
  otherNames?: string;
  lastName?: string;
}): FieldError[] {
  const result: FieldError[] = [];
  const regex = /[\0\n\f\v\r\t]/;
  if (firstName && regex.test(firstName)) {
    result.push({ field: 'firstName', message: 'first name contains invalid characters' });
  }

  if (otherNames && regex.test(otherNames)) {
    result.push({ field: 'otherNames', message: 'other names contain invalid characters' });
  }

  if (lastName && regex.test(lastName)) {
    result.push({ field: 'lastName', message: 'last name contains invalid characters' });
  }

  if (!firstName && !lastName) {
    result.push({
      field: 'firstName',
      message: 'need at least first or last name contains invalid characters',
    });
    result.push({
      field: 'lastName',
      message: 'need at least first or last name contains invalid characters',
    });
  }

  if ((!firstName || !lastName) && otherNames) {
    result.push({
      field: 'otherNames',
      message: 'other names only allowed when this is already a first and last name',
    });
  }
  return result;
}
