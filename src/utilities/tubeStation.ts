import { TubeStation } from '.prisma/client';

export function graphqlTubeStation(tubeStation: TubeStation) {
  const { uid: id, createdAt, updatedAt, name } = tubeStation;
  return { id, createdAt, updatedAt, name };
}
