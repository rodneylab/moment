import { arg, extendType, inputObjectType, nonNull, objectType, stringArg } from 'nexus';
import { NexusGenObjects } from 'nexus-typegen';
import { Context } from '../context';
import {
  geoCordinatesFromOpenMapUrl,
  graphqlGallery,
  sortGalleries,
  validName,
  validOpeningHours,
  validOpenMapUrl,
  validPostalAddress,
} from '../utilities/gallery';
import { notEmpty, validSlug, validUrl } from '../utilities/utilities';
import { Exhibition } from './Exhibition';
import { OpeningHours } from './OpeningHours';
import { PostalAddress } from './PostalAddress';
import { TubeStation } from './TubeStation';

export const Location = objectType({
  name: 'Location',
  definition(t) {
    t.nonNull.float('latitude');
    t.nonNull.float('longitude');
  },
});

export const Gallery = objectType({
  name: 'Gallery',
  definition(t) {
    t.nonNull.string('id');
    t.field('createdAt', { type: nonNull('Date') });
    t.field('createdAt', { type: nonNull('Date') });
    t.nonNull.string('name');
    t.nonNull.string('slug');
    t.string('address');
    t.field('postalAddress', { type: nonNull(PostalAddress) });
    t.field('location', { type: nonNull(Location) });
    t.string('openStreetMap');
    t.string('openingTimes');
    t.string('byAppointmentOpeningTimes');
    t.field('openingHours', { type: nonNull(OpeningHours) });
    t.field('byAppointmentOpeningHours', { type: nonNull(OpeningHours) });
    t.list.nonNull.field('exhibitions', { type: nonNull(Exhibition) });
    t.list.nonNull.field('nearestTubes', { type: nonNull(TubeStation) });
    t.string('tubes');
    t.string('googleMap');
    t.string('website');
    t.string('websiteUrl');
  },
});

export const GalleryQueryResponse = objectType({
  name: 'GalleryQueryResponse',
  definition(t) {
    t.list.field('galleries', { type: nonNull(Gallery) });
    t.string('error');
  },
});

export const PaginatedGalleries = objectType({
  name: 'PaginatedGalleries',
  definition(t) {
    t.list.nonNull.field('galleries', { type: nonNull(Gallery) });
    t.boolean('hasMore');
  },
});

export const OpeningHoursInput = inputObjectType({
  name: 'OpeningHoursInput',
  definition(t) {
    t.nonNull.list.nonNull.field('openingHoursRanges', { type: nonNull('OpeningHoursRangeInput') });
  },
});

export const OpeningHoursRangeInput = inputObjectType({
  name: 'OpeningHoursRangeInput',
  definition(t) {
    t.nonNull.int('startDay');
    t.nonNull.int('endDay');
    t.nonNull.int('openingTime');
    t.nonNull.int('closingTime');
  },
});

export const CreateGalleryInput = inputObjectType({
  name: 'CreateGalleryInput',
  definition(t) {
    t.nonNull.string('name');
    t.nonNull.string('slug');
    t.nonNull.field('postalAddress', { type: nonNull('AddressInput') });
    t.string('openStreetMapUrl');
    t.field('openingHours', { type: nonNull('OpeningHoursInput') });
    t.nonNull.list.nonNull.string('nearestTubes');
    t.nonNull.string('googleMap');
    t.nonNull.string('website');
  },
});

export const UpdateGalleryInput = inputObjectType({
  name: 'UpdateGalleryInput',
  definition(t) {
    t.nonNull.string('id');
    t.string('name');
    t.string('slug');
    t.field('postalAddress', { type: nonNull('AddressInput') });
    t.field('replacementOpeningHours', { type: nonNull('OpeningHoursInput') });
    t.field('replacementByAppointmentOpeningHours', { type: nonNull('OpeningHoursInput') });
    t.list.nonNull.string('addNearestTubes');
    t.list.nonNull.string('removeNearestTubes');
    t.string('openStreetMapUrl');
    t.string('website');
  },
});

export const CreateGalleryResponse = objectType({
  name: 'CreateGalleryResponse',
  definition(t) {
    t.field('gallery', { type: nonNull('Gallery') });
    t.list.nonNull.field('errors', { type: nonNull('FieldError') });
  },
});

export const GalleryQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('galleries', {
      type: PaginatedGalleries,
      args: {},
      async resolve(_root, _args, ctx: Context) {
        try {
          const galleries = await ctx.prisma.gallery.findMany({
            take: 100,
            orderBy: { name: 'asc' },
            include: {
              address: true,
              exhibitions: true,
              location: true,
              nearestTubes: { include: { tubeStation: true } },
              openingHours: { include: { openingHoursRanges: true } },
              byAppointmentOpeningHours: { include: { openingHoursRanges: true } },
            },
          });

          return {
            galleries: sortGalleries(galleries).map((element) => graphqlGallery(element)),
            hasMore: false,
          };
        } catch (error) {
          console.error('Error in galleries Query resolver');
          return { galleries: [], hasMore: false };
        }
      },
    }),
      t.nonNull.field('gallery', {
        type: GalleryQueryResponse,
        args: { slug: nonNull(stringArg()) },
        async resolve(_root, args, ctx: Context) {
          try {
            const { slug } = args;
            const gallery = await ctx.prisma.gallery.findUnique({
              where: { slug },
              include: {
                address: true,
                exhibitions: true,
                location: true,
                nearestTubes: { include: { tubeStation: true } },
                openingHours: { include: { openingHoursRanges: true } },
                byAppointmentOpeningHours: { include: { openingHoursRanges: true } },
              },
            });

            if (!gallery) {
              return { error: 'No gallery found with that slug' };
            }
            return { gallery: graphqlGallery(gallery) };
          } catch (error) {
            console.error('Error in gallery Query resolver');
            return { galleries: [], hasMore: false };
          }
        },
      });
  },
});

export const GalleryMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createGallery', {
      type: CreateGalleryResponse,
      args: { input: arg({ type: nonNull(CreateGalleryInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { user } = ctx.request.session;
          const { input } = args;
          if (!user) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const {
            name,
            postalAddress,
            openStreetMapUrl,
            nearestTubes,
            openingHours,
            slug,
            website,
          } = input;

          const errors: FieldError[] = [];

          // check gallery does not already exist
          const existingGallery = await ctx.prisma.gallery.findFirst({
            where: { OR: [{ name }, { slug }] },
          });
          if (existingGallery) {
            if (existingGallery.name === name) {
              errors.push({ field: 'name', message: 'There is already a gallery with that name.' });
            } else {
              errors.push({ field: 'slug', message: 'There is already a gallery with that slug.' });
            }
          }
          errors.push(...validName(name, 'name'));
          if (openingHours) {
            errors.push(...validOpeningHours(openingHours));
          }
          errors.push(...validSlug(slug, 'slug'));
          postalAddress && errors.push(...validPostalAddress(postalAddress));
          openStreetMapUrl && errors.push(...validOpenMapUrl(openStreetMapUrl));
          errors.push(...validUrl(website, 'website'));

          // query existing tube stations
          let tubeStationsNotEmpty: NexusGenObjects['TubeStation'][] = [];
          if (nearestTubes) {
            const promises = nearestTubes.map((element: string) =>
              ctx.prisma.tubeStation.findUnique({ where: { name: element } }),
            );
            const tubeStations = await Promise.all(promises);
            tubeStationsNotEmpty.forEach(({ name }) => {
              errors.push({
                field: 'tubeStations',
                message: `${name} is not yet in database, add it first`,
              });
            });
            tubeStationsNotEmpty = tubeStations.filter(notEmpty);
          }

          if (errors.length > 0) {
            return { errors };
          }
          // create new gallery
          const gallery = await ctx.prisma.gallery.create({
            data: {
              name,
              slug,
              address: {
                create: {
                  ...postalAddress,
                },
              },
              ...(openingHours && openingHours?.openingHoursRanges.length !== 0
                ? {
                    openingHours: {
                      create: {
                        openingHoursRanges: {
                          createMany: { data: openingHours.openingHoursRanges },
                        },
                      },
                    },
                  }
                : {}),
              ...(openStreetMapUrl
                ? { location: { create: { ...geoCordinatesFromOpenMapUrl(openStreetMapUrl) } } }
                : {}),
              nearestTubes: {
                /* creating a gallery/station pairing here which is why we use create even though
                 * stations exist already
                 */
                createMany: {
                  data: tubeStationsNotEmpty.map(({ id }) => ({
                    tubeStationId: id,
                  })),
                },
              },
              website,
            },
            include: {
              address: true,
              exhibitions: true,
              location: true,
              nearestTubes: { include: { tubeStation: true } },
              openingHours: { include: { openingHoursRanges: true } },
              byAppointmentOpeningHours: { include: { openingHoursRanges: true } },
            },
          });
          return { gallery: graphqlGallery(gallery) };
        } catch (error: unknown) {
          console.error('Error creating new gallery');
          return { errors: [{ field: 'unknown', message: error as string }] };
        }
      },
    });
    t.nonNull.boolean('deleteGallery', {
      args: { id: nonNull(stringArg()) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { user } = ctx.request.session;
          const { id } = args;
          if (!user) {
            return false;
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return false;
          }

          // todo(rodneylab): check relations and only allow deletions where it makes sense
          const gallery = await ctx.prisma.gallery.findUnique({
            where: { uid: id },
          });
          if (!gallery) {
            return false;
          }
          const { id: galleryId } = gallery;
          await ctx.prisma.galleryTubeStations.deleteMany({ where: { galleryId } });
          await ctx.prisma.gallery.delete({ where: { id: galleryId } });
          return true;
        } catch (error: unknown) {
          const { id } = args;
          console.error(`Error deleting tubeStation ${id}: ${error as string}`);
          return false;
        }
      },
    });
    t.nonNull.field('updateGallery', {
      type: CreateGalleryResponse,
      args: { input: arg({ type: nonNull(UpdateGalleryInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { user } = ctx.request.session;
          const { input } = args;

          if (!user) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }

          const { id: uid } = input;
          const gallery = await ctx.prisma.gallery.findUnique({
            where: { uid },
          });
          if (!gallery) {
            return {
              errors: [{ field: 'id', message: `Wasn't able to find a gallery with that id` }],
            };
          }

          const errors: NexusGenObjects['FieldError'][] = [];

          const {
            addNearestTubes,
            name,
            postalAddress,
            slug,
            openStreetMapUrl,
            removeNearestTubes,
            replacementOpeningHours,
            replacementByAppointmentOpeningHours,
            website,
          } = input;

          if (replacementOpeningHours) {
            errors.push(...validOpeningHours(replacementOpeningHours));
          }
          if (replacementByAppointmentOpeningHours) {
            errors.push(...validOpeningHours(replacementByAppointmentOpeningHours));
          }

          // query existing tube stations
          let tubeStationsNotEmpty: NexusGenObjects['TubeStation'][] = [];
          if (addNearestTubes) {
            const promises = addNearestTubes.map((element) =>
              ctx.prisma.tubeStation.findUnique({ where: { name: element } }),
            );
            const tubeStations = await Promise.all(promises);
            tubeStationsNotEmpty = tubeStations.filter(notEmpty);
            tubeStationsNotEmpty.forEach(({ name }) => {
              errors.push({
                field: 'tubeStations',
                message: `${name} is not yet in database, add it first`,
              });
            });
          }

          if (errors.length > 0) {
            return { errors };
          }

          if (removeNearestTubes) {
            const removeStationPromises = removeNearestTubes.map(async (element) =>
              ctx.prisma.tubeStation.findUnique({ where: { name: element } }),
            );
            const removeStations = await Promise.all(removeStationPromises);
            removeStations.forEach((element, index) => {
              if (element == null) {
                errors.push({
                  field: 'tubeStations',
                  message: `${removeNearestTubes[index]} is not yet in database, unable to delete`,
                });
              }
            });

            if (errors.length > 0) {
              return { errors };
            }

            const { id: galleryId } = gallery;
            const removePromises = removeStations.filter(notEmpty).map((element) => {
              const { id: tubeStationId } = element;
              return ctx.prisma.galleryTubeStations.delete({
                where: { galleryId_tubeStationId: { galleryId, tubeStationId } },
              });
            });

            await Promise.all(removePromises);
          }

          if (replacementOpeningHours) {
            await ctx.prisma.gallery.update({
              where: { uid },
              data: {
                openingHours: {
                  disconnect: true,
                },
              },
            });
          }
          if (replacementByAppointmentOpeningHours) {
            await ctx.prisma.gallery.update({
              where: { uid },
              data: {
                byAppointmentOpeningHours: {
                  disconnect: true,
                },
              },
            });
          }
          const updatedGallery = await ctx.prisma.gallery.update({
            where: {
              uid,
            },
            data: {
              ...(name ? { name } : {}),
              ...(slug ? { slug } : {}),
              address: {
                update: {
                  ...postalAddress,
                },
              },
              ...(replacementOpeningHours
                ? {
                    openingHours: {
                      create: {
                        openingHoursRanges: {
                          createMany: { data: replacementOpeningHours.openingHoursRanges },
                        },
                      },
                    },
                  }
                : {}),
              ...(replacementByAppointmentOpeningHours
                ? {
                    byAppointmentOpeningHours: {
                      create: {
                        openingHoursRanges: {
                          createMany: {
                            data: replacementByAppointmentOpeningHours.openingHoursRanges,
                          },
                        },
                      },
                    },
                  }
                : {}),
              nearestTubes: {
                /* creating a gallery/station pairing here which is why we use create even though
                 * stations exist already
                 */
                createMany: {
                  data: tubeStationsNotEmpty.map((element) => ({
                    tubeStationId: element.id,
                  })),
                },
              },
              ...(openStreetMapUrl
                ? { location: { create: { ...geoCordinatesFromOpenMapUrl(openStreetMapUrl) } } }
                : {}),
              ...(website ? { website } : {}),
            },
            include: {
              address: true,
              location: true,
              exhibitions: true,
              nearestTubes: { include: { tubeStation: true } },
              openingHours: { include: { openingHoursRanges: true } },
              byAppointmentOpeningHours: { include: { openingHoursRanges: true } },
            },
          });
          return { gallery: graphqlGallery(updatedGallery) };
        } catch (error: unknown) {
          const { input } = args;
          console.error(`Error updating gallery ${input.id}: ${error as string}`);
          return { errors: [{ field: 'unknown', message: error as string }] };
        }
      },
    });
  },
});
