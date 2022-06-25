import { TubeStation } from '@prisma/client';
import FieldError from 'src/resolvers/FieldError';

export function graphqlTubeStation(tubeStation: TubeStation) {
  const { uid: id, createdAt, updatedAt, name, slug } = tubeStation;
  return { id, createdAt, updatedAt, name, slug };
}

export function validName(name: string, fieldName: string): FieldError[] {
  const result: FieldError[] = [];
  if (/[\0\n\f\v\n\r\t]/.test(name)) {
    result.push({ field: fieldName, message: `${fieldName} contains invalid characters` });
  }
  return result;
}
