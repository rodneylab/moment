import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import type { Context } from '../context';
import TubeStation from '../entities/TubeStation';
import { graphqlTubeStation, validName } from '../utilities/tubeStation';
import { validSlug } from '../utilities/utilities';
import FieldError from './FieldError';

@InputType()
class CreateTubeStationInput {
  @Field()
  name: string;

  @Field(() => String)
  slug: string;
}

@ObjectType()
class CreateTubeStationResponse {
  @Field(() => TubeStation, { nullable: true })
  tubeStation?: TubeStation;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@ObjectType()
class TubeStationQueryResponse {
  @Field(() => TubeStation, { nullable: true })
  tubeStation?: TubeStation;

  @Field(() => String, { nullable: true })
  error?: string;
}

@InputType()
class UpdateTubeStationInput {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  slug?: string;
}

@Resolver()
export class TubeStationResolver {
  @Query(() => TubeStationQueryResponse)
  async tubeStation(
    @Arg('slug') slug: string,
    @Ctx() { prisma }: Context,
  ): Promise<TubeStationQueryResponse> {
    const tubeStation = await prisma.tubeStation.findUnique({
      where: { slug },
    });

    if (!tubeStation) {
      return { error: 'No tube station found with that slug' };
    }
    return { tubeStation: graphqlTubeStation(tubeStation) };
  }

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
    @Arg('input') input: CreateTubeStationInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<CreateTubeStationResponse> {
    try {
      const { user } = request.session;
      if (!user) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const { mfaAuthenticated, userId } = user;
      if (!userId || !mfaAuthenticated) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }

      const { name, slug } = input;

      const errors: FieldError[] = [];
      errors.push(...validName(name, 'name'));
      errors.push(...validSlug(slug, 'slug'));
      if (errors.length !== 0) {
        return { errors };
      }

      const existingTubeStation = await prisma.tubeStation.findFirst({
        where: { OR: [{ name }, { slug }] },
      });
      if (existingTubeStation) {
        if (existingTubeStation.name === name) {
          return {
            errors: [{ field: 'name', message: 'There is already a tube station with that name.' }],
          };
        } else {
          return {
            errors: [{ field: 'slug', message: 'There is already a tube station with that slug.' }],
          };
        }
      }

      const tubeStation = await prisma.tubeStation.create({
        data: { name, slug },
      });
      return { tubeStation: graphqlTubeStation(tubeStation) };
    } catch (error: unknown) {
      console.error('Error creating new tubeStation');
      return { errors: [{ field: 'unknown', message: error as string }] };
    }
  }

  @Mutation(() => Boolean)
  async deleteTubeStation(
    @Arg('id') id: string,
    @Ctx() { prisma, request }: Context,
  ): Promise<boolean> {
    try {
      const { user } = request.session;
      if (!user) {
        return false;
      }
      const { mfaAuthenticated, userId } = user;
      if (!userId || !mfaAuthenticated) {
        return false;
      }

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
    } catch (error: unknown) {
      console.error(`Error deleting tubeStation ${id}: ${error as string}`);
      return false;
    }
  }

  @Mutation(() => CreateTubeStationResponse)
  async updateTubeStation(
    @Arg('input') input: UpdateTubeStationInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<CreateTubeStationResponse> {
    try {
      const { user } = request.session;
      if (!user) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const { mfaAuthenticated, userId } = user;
      if (!userId || !mfaAuthenticated) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }

      const { id: uid } = input;
      const tubeStation = await prisma.tubeStation.findUnique({
        where: { uid },
      });
      if (!tubeStation) {
        return {
          errors: [{ field: 'id', message: `Wasn't able to find a tube station with that id` }],
        };
      }
      const { name, slug } = input;
      const updatedTubeStation = await prisma.tubeStation.update({
        where: {
          uid,
        },
        data: {
          ...(name ? { name } : {}),
          ...(slug ? { slug } : {}),
        },
      });
      return { tubeStation: graphqlTubeStation(updatedTubeStation) };
    } catch (error: unknown) {
      console.error(`Error updating tube station ${input.id}: ${error as string}`);
      return { errors: [{ field: 'unknown', message: error as string }] };
    }
  }
}

export { TubeStationResolver as default };
