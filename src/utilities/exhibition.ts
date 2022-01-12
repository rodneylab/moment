import { Exhibition } from '@prisma/client';
import type FieldError from 'src/resolvers/FieldError';
import GraphQLExhibition from '../entities/Exhibition';
import { DatabaseGallery, graphqlGallery } from './gallery';

type DatabaseExhitibion = Exhibition & {
  gallery: DatabaseGallery;
};

export function graphqlExhibition(exhibition: DatabaseExhitibion): GraphQLExhibition {
  const {
    uid,
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
    gallery,
  } = exhibition;

  return {
    id: uid,
    createdAt,
    updatedAt,
    name,
    description: description,
    summaryText: summaryText,
    hashtags,
    start: start?.toUTCString(),
    end: end?.toUTCString(),
    freeEntry,
    online,
    inPerson,
    gallery: graphqlGallery(gallery),
  };
}

export function sortExhibitions(exhibitions: DatabaseExhitibion[]): DatabaseExhitibion[] {
  const today = new Date();

  function started(start: Date) {
    return start <= today;
  }

  return exhibitions.sort((a, b) => {
    if (a?.start == null || a?.end == null) {
      return -1;
    }
    if (b?.start == null || b?.end == null) {
      return 1;
    }
    const { start: aStart, end: aEnd } = a;
    const { start: bStart, end: bEnd } = b;
    const aStarted = started(aStart);
    const bStarted = started(bStart);

    if (aStarted && bStarted) {
      return bEnd.getTime() !== aEnd.getTime()
        ? bEnd.getTime() - aEnd.getTime()
        : bStart.getTime() - aStart.getTime();
    }
    if (!aStarted && !bStarted) {
      return bStart.getTime() !== aStart.getTime()
        ? bStart.getTime() - aStart.getTime()
        : bEnd.getTime() - aEnd.getTime();
    }
    if (aStarted) {
      return bStart.getTime() - aStart.getTime();
    }
    return aStart.getTime() - bStart.getTime();
  });
}

export function validDate(date: string, fieldName: string): FieldError[] {
  const result: FieldError[] = [];
  const parsedDate = new Date(date);
  if (!parsedDate) {
    result.push({ field: fieldName, message: `${fieldName} does not seem to be valid` });
    return result;
  }
  const currentYear = new Date().getFullYear();
  if (parsedDate.getFullYear() < currentYear - 1) {
    result.push({ field: fieldName, message: `${fieldName} seems to be some time ago` });
  } else if (parsedDate.getFullYear() > currentYear + 1) {
    result.push({ field: fieldName, message: `${fieldName} seems to be some fairly far off` });
  }
  return result;
}

export function validName(name: string, fieldName: string): FieldError[] {
  const result: FieldError[] = [];
  if (/[\0\n\f\v\n\r\t]/.test(name)) {
    result.push({ field: fieldName, message: `${fieldName} contains invalid characters` });
  }
  return result;
}
