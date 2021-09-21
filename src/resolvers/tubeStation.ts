import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import type { Context } from '../context';
import TubeStation from '../entities/TubeStation';
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
      return prisma.tubeStation.findMany({ take: 999 });
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
      return { tubeStation };
    } catch (error) {
      console.error('Error creating new tubeStation');
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { TubeStationResolver as default };
