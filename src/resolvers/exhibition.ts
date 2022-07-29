import { Photographer } from '@prisma/client';
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import type { Context } from '../context';
import Exhibition from '../entities/Exhibition';
import { graphqlExhibition, sortExhibitions, validDate, validName } from '../utilities/exhibition';
import { notEmpty, validUrl } from '../utilities/utilities';
import FieldError from './FieldError';

@InputType()
class CreateExhibitionInput {
  @Field()
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  summaryText: string;

  @Field(() => String, { nullable: true })
  bodyText?: string;

  @Field(() => String, { nullable: true })
  url?: string;

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

@InputType()
class UpdateExhibitionInput {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => [String], { nullable: true })
  addPhotographers: string[];

  @Field(() => [String], { nullable: true })
  removePhotographers: string[];

  @Field(() => String, { nullable: true })
  summaryText?: string;

  @Field(() => String, { nullable: true })
  bodyText?: string;

  @Field(() => String, { nullable: true })
  url?: string;
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
            byAppointmentOpeningHours: { include: { openingHoursRanges: true } },
          },
        },
        photographers: { include: { exhibitions: true } },
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
              byAppointmentOpeningHours: { include: { openingHoursRanges: true } },
            },
          },
          photographers: { include: { exhibitions: true } },
        },
      })) ?? {};

    return {
      exhibitions: sortExhibitions(exhibitions).map((element) => graphqlExhibition(element)),
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
        bodyText,
        description,
        end,
        freeEntry,
        gallery: gallerySlug,
        hashtags,
        inPerson,
        online,
        start,
        summaryText,
        url,
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
      url && errors.push(...validUrl(url, 'url'));

      if (errors.length > 0) {
        return { errors };
      }

      // create new gallery
      const exhibition = await prisma.exhibition.create({
        data: {
          createdBy: { connect: { uid: userId } },
          name,
          ...(bodyText ? { bodyText } : {}),
          description,
          summaryText,
          hashtags,
          gallery: { connect: { slug: gallerySlug } },
          start: new Date(start),
          end: new Date(end),
          freeEntry,
          online,
          inPerson,
          ...(url ? { url } : {}),
        },
        include: {
          gallery: {
            include: {
              address: true,
              exhibitions: true,
              location: true,
              nearestTubes: { include: { tubeStation: true } },
              openingHours: { include: { openingHoursRanges: true } },
              byAppointmentOpeningHours: { include: { openingHoursRanges: true } },
            },
          },
          photographers: { include: { exhibitions: true } },
        },
      });
      return { exhibition: graphqlExhibition(exhibition) };
    } catch (error: unknown) {
      console.error('Error creating new exhibition');
      return { errors: [{ field: 'unknown', message: error as string }] };
    }
  }

  @Mutation(() => CreateExhibitionResponse)
  async updateExhibition(
    @Arg('input') input: UpdateExhibitionInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<CreateExhibitionResponse> {
    try {
      const { user } = request.session;
      if (!user) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const { mfaAuthenticated, userId } = user;
      if (!userId || !mfaAuthenticated) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }

      const { id: uid, addPhotographers, removePhotographers, url } = input;
      const exhibition = await prisma.exhibition.findUnique({
        where: { uid },
        include: { photographers: true },
      });
      if (!exhibition) {
        return {
          errors: [{ field: 'id', message: `Wasn't able to find an exhibition with that id` }],
        };
      }

      const errors: FieldError[] = [];
      url && errors.push(...validUrl(url, 'url'));

      // query existing photographers
      let addPhotographersNotEmpty: Photographer[] = [];
      if (addPhotographers) {
        const promises = addPhotographers.map((element) =>
          prisma.photographer.findUnique({ where: { slug: element } }),
        );
        const photographers = await Promise.all(promises);
        addPhotographersNotEmpty = photographers.filter(notEmpty);
        addPhotographersNotEmpty.forEach((element, index) => {
          if (element == null) {
            errors.push({
              field: 'addPhotographers',
              message: `${addPhotographers[index]} is not yet in database, add it first`,
            });
          }
        });

        if (errors.length > 0) {
          return { errors };
        }

        addPhotographersNotEmpty.forEach((element, index) => {
          if (
            exhibition.photographers.find(
              (exhibitionPhotographerElement) => element.id === exhibitionPhotographerElement.id,
            )
          ) {
            errors.push({
              field: 'addPhotographers',
              message: `${addPhotographers[index]} is already on ${exhibition.name} photographers list`,
            });
          }
        });
      }

      let removePhotographersNotEmpty: Photographer[] = [];
      if (removePhotographers) {
        const promises = removePhotographers.map((element) =>
          prisma.photographer.findUnique({ where: { slug: element } }),
        );
        const photographers = await Promise.all(promises);
        removePhotographersNotEmpty = photographers.filter(notEmpty);
        removePhotographersNotEmpty.forEach((element, index) => {
          if (
            !exhibition.photographers.find(
              (exhibitionPhotographerElement) => element.id === exhibitionPhotographerElement.id,
            )
          ) {
            errors.push({
              field: 'addPhotographers',
              message: `${addPhotographers[index]} is not on ${exhibition.name} photographers list`,
            });
          }
        });
      }

      const { bodyText, summaryText } = input;

      const updatedExhibition = await prisma.exhibition.update({
        where: {
          uid,
        },
        data: {
          ...(bodyText ? { bodyText } : {}),
          ...(summaryText ? { summaryText } : {}),
          ...(url ? { url } : {}),
          ...(addPhotographersNotEmpty || removePhotographersNotEmpty
            ? {
                photographers: {
                  ...(addPhotographersNotEmpty
                    ? {
                        connect: addPhotographersNotEmpty.map((element) => ({
                          id: element.id,
                        })),
                      }
                    : {}),
                  ...(removePhotographersNotEmpty
                    ? {
                        disconnect: removePhotographersNotEmpty.map((element) => ({
                          id: element.id,
                        })),
                      }
                    : {}),
                },
              }
            : {}),
        },
        include: {
          gallery: {
            include: {
              address: true,
              exhibitions: true,
              location: true,
              nearestTubes: { include: { tubeStation: true } },
              openingHours: { include: { openingHoursRanges: true } },
              byAppointmentOpeningHours: { include: { openingHoursRanges: true } },
            },
          },
          photographers: { include: { exhibitions: true } },
        },
      });
      return { exhibition: graphqlExhibition(updatedExhibition) };
    } catch (error: unknown) {
      console.error('Error updating exhibition');
      return { errors: [{ field: 'unknown', message: error as string }] };
    }
  }
}

export { ExhibitionResolver as default };
