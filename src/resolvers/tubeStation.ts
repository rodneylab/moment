import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import type { Context } from '../context';
import TubeStation from '../entities/TubeStation';
import { graphqlTubeStation } from '../utilities/tubeStation';
import FieldError from './FieldError';

@ObjectType()
class CreateTubeStationResponse {
  @Field(() => TubeStation, { nullable: true })
  tubeStation?: TubeStation;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@Resolver()
export class TubeStationResolver {
  @Query(() => [TubeStation])
  async tubeStations(@Ctx() { prisma }: Context): Promise<TubeStation[]> {
    try {
      const tubeStations = await prisma.tubeStation.findMany({
        take: 999,
        orderBy: { name: 'asc' },
      });
      return tubeStations.map((element) => graphqlTubeStation(element));
    } catch (error) {
      console.error('Unknown error running tubeStations query');
      return [];
    }
  }

  @Mutation(() => CreateTubeStationResponse)
  async createTubeStation(
    @Arg('name') name: string,
    @Ctx() { prisma }: Context,
  ): Promise<CreateTubeStationResponse> {
    try {
      const existingTubeStation = await prisma.tubeStation.findUnique({ where: { name } });
      if (existingTubeStation) {
        return {
          errors: [{ field: 'name', message: 'There is already a tube station with that name.' }],
        };
      }
      const tubeStation = await prisma.tubeStation.create({
        data: { name },
      });
      return { tubeStation: graphqlTubeStation(tubeStation) };
    } catch (error) {
      console.error('Error creating new tubeStation');
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }

  @Mutation(() => Boolean)
  async deleteTubeStation(@Arg('id') id: string, @Ctx() { prisma }: Context): Promise<boolean> {
    try {
      // todo(rodneylab): check relations and only allow deletions if it makes sense
      const tubeStation = await prisma.tubeStation.findUnique({ where: { uid: id } });
      if (!tubeStation) {
        return false;
      }
      const { id: tubeStationId } = tubeStation;
      await prisma.galleryTubeStations.deleteMany({
        where: { tubeStationId },
      });
      await prisma.tubeStation.delete({ where: { id: tubeStationId } });
      return true;
    } catch (error) {
      console.error(`Error deleting tubeStation ${id}: ${error}`);
      return false;
    }
  }
}

export { TubeStationResolver as default };
