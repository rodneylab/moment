import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import type { Context } from '../context';
import Photographer from '../entities/Photographer';
import { graphqlPhotographer, sortPhotographers, validFullName } from '../utilities/photographer';
import { validSlug, validUrl } from '../utilities/utilities';
import FieldError from './FieldError';

@InputType()
class CreatePhotographerInput {
  @Field({ nullable: true })
  firstName: string;

  @Field({ nullable: true })
  otherNames: string;

  @Field({ nullable: true })
  lastName: string;

  @Field(() => String)
  slug: string;

  @Field({ nullable: true })
  website: string;
}

@ObjectType()
class CreatePhotographerResponse {
  @Field(() => Photographer, { nullable: true })
  photographer?: Photographer;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@ObjectType()
class PhotographerQueryResponse {
  @Field(() => Photographer, { nullable: true })
  photographer?: Photographer;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
class PaginatedPhotographers {
  @Field(() => [Photographer])
  exhibitions: Photographer[];

  @Field()
  hasMore: boolean;
}

@Resolver()
export class PhotographerResolver {
  @Query(() => PhotographerQueryResponse)
  async photographer(
    @Arg('slug') slug: string,
    @Ctx() { prisma }: Context,
  ): Promise<PhotographerQueryResponse> {
    const photographer = await prisma.photographer.findUnique({
      where: { slug },
      include: {
        exhibitions: true,
      },
    });

    if (!photographer) {
      return { error: 'No photographer found with that id' };
    }
    return { photographer: graphqlPhotographer(photographer) };
  }

  @Query(() => PaginatedPhotographers)
  async photographers(@Ctx() { prisma }: Context): Promise<PaginatedPhotographers> {
    const photographers =
      (await prisma.photographer.findMany({
        take: 100,
        include: {
          exhibitions: true,
        },
      })) ?? {};

    return {
      exhibitions: sortPhotographers(photographers).map((element) => graphqlPhotographer(element)),
      hasMore: false,
    };
  }

  @Mutation(() => CreatePhotographerResponse)
  async createGallery(
    @Arg('input') input: CreatePhotographerInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<CreatePhotographerResponse> {
    try {
      const { user } = request.session;
      if (!user) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const { mfaAuthenticated, userId } = user;
      if (!userId || !mfaAuthenticated) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const {
        firstName: untrimmedFirstName,
        lastName: untrimmedLastName,
        otherNames: untrimmedOtherNames,
        slug,
        website,
      } = input;

      const firstName = untrimmedFirstName.trim();
      const otherNames = untrimmedOtherNames.trim();
      const lastName = untrimmedLastName.trim();

      const errors: FieldError[] = [];

      // check photographer does not already exist
      const existingPhotographer = await prisma.photographer.findUnique({
        where: { slug },
      });
      if (existingPhotographer) {
        errors.push({
          field: 'slug',
          message: 'There is already a photographer with that slug.',
        });
      }
      errors.push(...validFullName({ firstName, otherNames, lastName }));
      errors.push(...validSlug(slug, 'slug'));
      errors.push(...validUrl(website, 'website'));

      if (errors.length > 0) {
        return { errors };
      }
      // create new photographer
      const photographer = await prisma.photographer.create({
        data: {
          createdBy: { connect: { uid: userId } },
          ...(firstName ? { firstName } : {}),
          ...(otherNames ? { otherNames } : {}),
          ...(lastName ? { lastName } : {}),
          slug,
          website,
        },
        include: {
          exhibitions: true,
        },
      });
      return { photographer: graphqlPhotographer(photographer) };
    } catch (error) {
      console.error('Error creating new photographer');
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { PhotographerResolver as default };
