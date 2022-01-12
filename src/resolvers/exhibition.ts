import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import type { Context } from '../context';
import Exhibition from '../entities/Exhibition';
import { graphqlExhibition, validDate, validName } from '../utilities/exhibition';
import FieldError from './FieldError';

@InputType()
class CreateExhibitionInput {
  @Field()
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  summaryText: string;

  @Field(() => [String], { nullable: true })
  hashtags: string[];

  @Field(() => String)
  gallery: string;

  @Field(() => String)
  start: string;

  @Field(() => String)
  end: string;

  @Field(() => Boolean)
  freeEntry: boolean;

  @Field(() => Boolean)
  online: boolean;

  @Field(() => Boolean)
  inPerson: boolean;
}

@ObjectType()
class CreateExhibitionResponse {
  @Field(() => Exhibition, { nullable: true })
  exhibition?: Exhibition;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@ObjectType()
class ExhibitionQueryResponse {
  @Field(() => Exhibition, { nullable: true })
  exhibition?: Exhibition;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
class PaginatedExhibitions {
  @Field(() => [Exhibition])
  exhibitions: Exhibition[];

  @Field()
  hasMore: boolean;
}

@Resolver()
export class ExhibitionResolver {
  @Query(() => ExhibitionQueryResponse)
  async exhibition(
    @Arg('id') id: string,
    @Ctx() { prisma }: Context,
  ): Promise<ExhibitionQueryResponse> {
    const exhibition = await prisma.exhibition.findUnique({
      where: { uid: id },
      include: {
        gallery: {
          include: {
            address: true,
            exhibitions: true,
            location: true,
            nearestTubes: { include: { tubeStation: true } },
            openingHours: { include: { openingHoursRanges: true } },
          },
        },
      },
    });

    if (!exhibition) {
      return { error: 'No exhibition found with that id' };
    }
    return { exhibition: graphqlExhibition(exhibition) };
  }

  @Query(() => PaginatedExhibitions)
  async exhibitions(@Ctx() { prisma }: Context): Promise<PaginatedExhibitions> {
    const exhibitions =
      (await prisma.exhibition.findMany({
        take: 100,
        include: {
          gallery: {
            include: {
              address: true,
              exhibitions: true,
              location: true,
              nearestTubes: { include: { tubeStation: true } },
              openingHours: { include: { openingHoursRanges: true } },
            },
          },
        },
      })) ?? {};

    return {
      exhibitions: exhibitions.map((element) => graphqlExhibition(element)),
      hasMore: false,
    };
  }

  // gallery must aleady exist
  @Mutation(() => CreateExhibitionResponse)
  async createExhibition(
    @Arg('input') input: CreateExhibitionInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<CreateExhibitionResponse> {
    try {
      const { user } = request.session ?? {};
      if (!user) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const { mfaAuthenticated, userId } = user;
      if (!userId || !mfaAuthenticated) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const {
        name,
        description,
        end,
        freeEntry,
        gallery: gallerySlug,
        hashtags,
        inPerson,
        online,
        start,
        summaryText,
      } = input;

      const errors: FieldError[] = [];

      // check gallery does not already exist
      const gallery =
        (await prisma.gallery.findUnique({
          where: { slug: gallerySlug },
        })) ?? {};
      if (!gallery) {
        errors.push({ field: 'slug', message: 'There is already a gallery with that slug.' });
      }
      errors.push(...validName(name, 'name'));
      errors.push(...validDate(start, 'startDate'));
      errors.push(...validDate(end, 'endDate'));

      if (errors.length > 0) {
        return { errors };
      }

      // create new gallery
      const exhibition = await prisma.exhibition.create({
        data: {
          createdBy: { connect: { uid: userId } },
          name,
          description,
          summaryText,
          hashtags,
          gallery: { connect: { slug: gallerySlug } },
          start: new Date(start),
          end: new Date(end),
          freeEntry,
          online,
          inPerson,
        },
        include: {
          gallery: {
            include: {
              address: true,
              exhibitions: true,
              location: true,
              nearestTubes: { include: { tubeStation: true } },
              openingHours: { include: { openingHoursRanges: true } },
            },
          },
        },
      });
      return { exhibition: graphqlExhibition(exhibition) };
    } catch (error) {
      console.error('Error creating new exhibition');
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { ExhibitionResolver as default };
