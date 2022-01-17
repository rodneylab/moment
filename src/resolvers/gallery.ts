import { TubeStation } from '.prisma/client';
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import type { Context } from '../context';
import Gallery from '../entities/Gallery';
import {
  geoCordinatesFromOpenMapUrl,
  graphqlGallery,
  sortGalleries,
  validName,
  validOpeningHours,
  validOpenMapUrl,
  validPostalAddress,
  validUrl,
} from '../utilities/gallery';
import { validSlug } from '../utilities/utilities';
import AddressInput from './AddressInput';
import FieldError from './FieldError';

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

@InputType()
class OpeningHoursRangeInput {
  @Field()
  startDay: number;

  @Field()
  endDay: number;

  @Field()
  openingTime: string;

  @Field()
  closingTime: string;
}

@InputType()
export class OpeningHoursInput {
  @Field(() => [OpeningHoursRangeInput], { nullable: true })
  openingHoursRanges: OpeningHoursRangeInput[];
}

@InputType()
class CreateGalleryInput {
  @Field()
  name: string;

  @Field(() => String)
  slug: string;

  @Field(() => AddressInput, { nullable: true })
  postalAddress: AddressInput;

  @Field({ nullable: true })
  openStreetMapUrl: string;

  @Field(() => OpeningHoursInput, { nullable: true })
  openingHours: OpeningHoursInput;

  @Field(() => [String], { nullable: true })
  nearestTubes: string[];

  @Field({ nullable: true })
  googleMap: string;

  @Field({ nullable: true })
  website: string;
}

@ObjectType()
class CreateGalleryResponse {
  @Field(() => Gallery, { nullable: true })
  gallery?: Gallery;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@ObjectType()
class GalleryQueryResponse {
  @Field(() => Gallery, { nullable: true })
  gallery?: Gallery;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
class PaginatedGalleries {
  @Field(() => [Gallery])
  galleries: Gallery[];

  @Field()
  hasMore: boolean;
}

@InputType()
class UpdateGalleryInput {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => AddressInput, { nullable: true })
  postalAddress: AddressInput;

  @Field(() => OpeningHoursInput, { nullable: true })
  replacementOpeningHours?: OpeningHoursInput;

  @Field(() => OpeningHoursInput, { nullable: true })
  replacementByAppointmentOpeningHours?: OpeningHoursInput;

  @Field(() => [String], { nullable: true })
  addNearestTubes: string[];

  @Field(() => [String], { nullable: true })
  removeNearestTubes: string[];

  @Field(() => String, { nullable: true })
  openStreetMapUrl?: string;

  @Field(() => String, { nullable: true })
  website?: string;
}

@Resolver()
export class GalleryResolver {
  @Query(() => PaginatedGalleries)
  async galleries(@Ctx() { prisma }: Context): Promise<PaginatedGalleries> {
    const galleries = await prisma.gallery.findMany({
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
  }

  @Query(() => GalleryQueryResponse)
  async gallery(
    @Arg('slug') slug: string,
    @Ctx() { prisma }: Context,
  ): Promise<GalleryQueryResponse> {
    const gallery = await prisma.gallery.findUnique({
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
  }

  // tube stations must aleady exist
  @Mutation(() => CreateGalleryResponse)
  async createGallery(
    @Arg('input') input: CreateGalleryInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<CreateGalleryResponse> {
    try {
      const { user } = request.session;
      if (!user) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const { mfaAuthenticated, userId } = user;
      if (!userId || !mfaAuthenticated) {
        return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
      }
      const { name, postalAddress, openStreetMapUrl, nearestTubes, openingHours, slug, website } =
        input;

      const errors: FieldError[] = [];

      // check gallery does not already exist
      const existingGallery = await prisma.gallery.findFirst({
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
      errors.push(...validPostalAddress(postalAddress));
      openStreetMapUrl && errors.push(...validOpenMapUrl(openStreetMapUrl));
      errors.push(...validUrl(website, 'website'));

      // query existing tube stations
      let tubeStationsNotEmpty: TubeStation[] = [];
      if (nearestTubes) {
        const promises = nearestTubes.map((element) =>
          prisma.tubeStation.findUnique({ where: { name: element } }),
        );
        const tubeStations = await Promise.all(promises);
        tubeStationsNotEmpty = tubeStations.filter(notEmpty);
        tubeStationsNotEmpty.forEach((element, index) => {
          if (element == null) {
            errors.push({
              field: 'tubeStations',
              message: `${tubeStations[index]} is not yet in database, add it first`,
            });
          }
        });
      }

      if (errors.length > 0) {
        return { errors };
      }
      // create new gallery
      const gallery = await prisma.gallery.create({
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
                    openingHoursRanges: { createMany: { data: openingHours.openingHoursRanges } },
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
              data: tubeStationsNotEmpty.map((element) => ({
                tubeStationId: element.id,
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
    } catch (error) {
      console.error('Error creating new gallery');
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }

  @Mutation(() => Boolean)
  async deleteGallery(
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

      // todo(rodneylab): check relations and only allow deletions where it makes sense
      const gallery = await prisma.gallery.findUnique({
        where: { uid: id },
      });
      if (!gallery) {
        return false;
      }
      const { id: galleryId } = gallery;
      await prisma.galleryTubeStations.deleteMany({ where: { galleryId } });
      await prisma.gallery.delete({ where: { id: galleryId } });
      return true;
    } catch (error) {
      console.error(`Error deleting tubeStation ${id}: ${error}`);
      return false;
    }
  }

  @Mutation(() => CreateGalleryResponse)
  async updateGallery(
    @Arg('input') input: UpdateGalleryInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<CreateGalleryResponse> {
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
      const gallery = await prisma.gallery.findUnique({
        where: { uid },
      });
      if (!gallery) {
        return { errors: [{ field: 'id', message: `Wasn't able to find a gallery with that id` }] };
      }

      const errors: FieldError[] = [];

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
      let tubeStationsNotEmpty: TubeStation[] = [];
      if (addNearestTubes) {
        const promises = addNearestTubes.map((element) =>
          prisma.tubeStation.findUnique({ where: { name: element } }),
        );
        const tubeStations = await Promise.all(promises);
        tubeStationsNotEmpty = tubeStations.filter(notEmpty);
        tubeStationsNotEmpty.forEach((element, index) => {
          if (element == null) {
            errors.push({
              field: 'tubeStations',
              message: `${tubeStations[index]} is not yet in database, add it first`,
            });
          }
        });
      }

      if (errors.length > 0) {
        return { errors };
      }

      if (replacementOpeningHours) {
        const { openingHoursId } = gallery ?? {};
        if (openingHoursId) {
          await prisma.openingHoursRange.deleteMany({ where: { id: openingHoursId } });
        }
      }
      if (replacementByAppointmentOpeningHours) {
        const { byAppointmentOpeningHoursId } = gallery ?? {};
        if (byAppointmentOpeningHoursId) {
          await prisma.openingHoursRange.deleteMany({ where: { id: byAppointmentOpeningHoursId } });
        }
      }
      if (removeNearestTubes) {
        const removeStationPromises = removeNearestTubes.map(async (element) =>
          prisma.tubeStation.findUnique({ where: { name: element } }),
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
          return prisma.galleryTubeStations.delete({
            where: { galleryId_tubeStationId: { galleryId, tubeStationId } },
          });
        });

        await Promise.all(removePromises);
      }

      const updatedGallery = await prisma.gallery.update({
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
                      createMany: { data: replacementByAppointmentOpeningHours.openingHoursRanges },
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
    } catch (error) {
      console.error(`Error updating gallery ${input.id}: ${error}`);
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { GalleryResolver as default };
