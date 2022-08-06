import { arg, extendType, inputObjectType, nonNull, objectType, stringArg } from 'nexus';
import type { NexusGenInputs, NexusGenObjects } from 'nexus-typegen';
import type { Context } from '../context';
import { graphqlExhibition, sortExhibitions, validDate, validName } from '../utilities/exhibition';
import { notEmpty, validUrl } from '../utilities/utilities';
import { Gallery } from './Gallery';
import { Photographer } from './Photographer';

export const Exhibition = objectType({
  name: 'Exhibition',
  definition(t) {
    t.nonNull.string('id');
    t.string('createdAt');
    t.string('updatedAt');
    t.nonNull.string('name');
    t.list.nonNull.field('photographers', { type: Photographer });
    t.string('description');
    t.string('summaryText');
    t.string('bodyText');
    t.string('url');
    t.nonNull.list.nonNull.string('hashtags');
    t.field('gallery', { type: Gallery });
    t.string('start');
    t.string('end');
    t.boolean('freeEntry');
    t.boolean('online');
    t.boolean('inPerson');
  },
});

export const FieldError = objectType({
  name: 'FieldError',
  definition(t) {
    t.nonNull.string('field');
    t.nonNull.string('message');
  },
});

export const CreateExhibitionInput = inputObjectType({
  name: 'CreateExhibitionInput',
  definition(t) {
    t.nonNull.string('name');
    t.nonNull.string('description');
    t.nonNull.string('summaryText');
    t.string('bodyText');
    t.string('url');
    t.nonNull.list.nonNull.string('hashtags');
    t.nonNull.string('gallery');
    t.nonNull.string('start');
    t.nonNull.string('end');
    t.nonNull.boolean('freeEntry');
    t.nonNull.boolean('online');
    t.nonNull.boolean('inPerson');
  },
});

export const UpdateExhibitionInput = inputObjectType({
  name: 'UpdateExhibitionInput',
  definition(t) {
    t.nonNull.string('id');
    t.string('name');
    t.nonNull.list.nonNull.string('addPhotographers');
    t.nonNull.list.nonNull.string('removePhotographers');
    t.string('summaryText');
    t.string('bodyText');
    t.string('url');
  },
});

export const CreateExhibitionResponse = objectType({
  name: 'CreateExhibitionResponse',
  definition(t) {
    t.field('exhibition', { type: Exhibition });
    t.list.field('errors', { type: FieldError });
  },
});

export const ExhibitionQueryResponse = objectType({
  name: 'ExhibitionQueryResponse',
  definition(t) {
    t.field('exhibition', { type: Exhibition });
    t.string('error');
  },
});

export const PaginatedExhibitions = objectType({
  name: 'PaginatedExhibitions',
  definition(t) {
    t.list.field('exhibitions', { type: Exhibition });
    t.boolean('hasMore');
  },
});

export const ExhibitionQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('exhibition', {
      type: ExhibitionQueryResponse,
      args: { id: nonNull(stringArg()) },
      async resolve(_root, args, ctx: Context) {
        const { id } = args;
        const exhibition = await ctx.db.exhibition.findUnique({
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
      },
    }),
      t.nonNull.field('exhibitions', {
        type: PaginatedExhibitions,
        async resolve(_root, _args, ctx: Context) {
          const exhibitions =
            (await ctx.db.exhibition.findMany({
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
        },
      });
  },
});

export const ExhibitionMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createExhibition', {
      type: CreateExhibitionResponse,
      args: { input: arg({ type: nonNull(CreateExhibitionInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { user } = ctx.session ?? {};
          if (!user) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }

          const {
            input: {
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
            },
          } = args as { input: NexusGenInputs['CreateExhibitionInput'] };

          const errors: NexusGenObjects['FieldError'][] = [];

          // check gallery does not already exist
          const gallery =
            (await ctx.db.gallery.findUnique({
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
          const exhibition = await ctx.db.exhibition.create({
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
      },
    });
    t.nonNull.field('updateExhibition', {
      type: CreateExhibitionResponse,
      args: { input: arg({ type: nonNull(UpdateExhibitionInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { input } = args as { input: NexusGenInputs['UpdateExhibitionInput'] };
          const { user } = ctx.session;
          if (!user) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }

          const { id: uid, addPhotographers, removePhotographers, url } = input;
          const exhibition = await ctx.db.exhibition.findUnique({
            where: { uid },
            include: { photographers: true },
          });
          if (!exhibition) {
            return {
              errors: [{ field: 'id', message: `Wasn't able to find an exhibition with that id` }],
            };
          }

          const errors: NexusGenObjects['FieldError'][] = [];
          url && errors.push(...validUrl(url, 'url'));

          // query existing photographers
          let addPhotographersNotEmpty: NexusGenObjects['Photographer'][] = [];
          if (addPhotographers) {
            const promises = addPhotographers.map((element) =>
              ctx.db.photographer.findUnique({ where: { slug: element } }),
            );
            const photographers = await Promise.all(promises);
            addPhotographersNotEmpty.forEach((element, index) => {
              if (element == null) {
                errors.push({
                  field: 'addPhotographers',
                  message: `${
                    addPhotographers[index] ?? 'unknown-photographer'
                  } is not yet in database, add it first`,
                });
              }
            });
            addPhotographersNotEmpty = photographers.filter(notEmpty);

            if (errors.length > 0) {
              return { errors };
            }

            addPhotographersNotEmpty.forEach(({ id }, index) => {
              if (
                exhibition.photographers.find(
                  (exhibitionPhotographerElement) => id === exhibitionPhotographerElement.id,
                )
              ) {
                errors.push({
                  field: 'addPhotographers',
                  message: `${addPhotographers[index] ?? 'unknown-phtographer'} is already on ${
                    exhibition.name
                  } photographers list`,
                });
              }
            });
          }

          let removePhotographersNotEmpty: NexusGenObjects['Photographer'][] = [];

          if (removePhotographers) {
            const promises = removePhotographers.map((element) =>
              ctx.db.photographer.findUnique({ where: { slug: element } }),
            );
            const photographers = await Promise.all(promises);
            removePhotographersNotEmpty = photographers.filter(notEmpty);
            removePhotographersNotEmpty.forEach(({ id }, index) => {
              if (
                !exhibition.photographers.find(
                  (exhibitionPhotographerElement) => id === exhibitionPhotographerElement.id,
                )
              ) {
                errors.push({
                  field: 'addPhotographers',
                  message: `${addPhotographers[index] ?? 'unknown-photographer'} is not on ${
                    exhibition.name
                  } photographers list`,
                });
              }
            });
          }

          const { bodyText, summaryText } = input;

          const updatedExhibition = await ctx.db.exhibition.update({
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
                            connect: addPhotographersNotEmpty.map(({ id: elementId }) => ({
                              id: elementId,
                            })),
                          }
                        : {}),
                      ...(removePhotographersNotEmpty
                        ? {
                            disconnect: removePhotographersNotEmpty.map(({ id: elementId }) => ({
                              id: elementId,
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
      },
    });
  },
});
