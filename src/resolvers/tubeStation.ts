import { Arg, Field, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import { context } from '../context';
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
  async tubeStations(): Promise<TubeStation[]> {
    return context.prisma.tubeStation.findMany({ take: 999 });
  }

  @Mutation(() => TubeStation)
  async createTubeStation(@Arg('name') name: string): Promise<CreateTubeStationResponse> {
    // check gallery does not already exist
    const existingTubeStation = await context.prisma.tubeStation.findFirst({ where: { name } });
    if (existingTubeStation) {
      return {
        errors: [{ field: 'name', message: 'There is already a tube station with that name.' }],
      };
    }

    const tubeStation = await context.prisma.tubeStation.create({
      data: { name },
    });

    return { tubeStation };
  }
}

export { TubeStationResolver as default };
