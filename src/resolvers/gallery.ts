import type { TubeStation } from '.prisma/client';
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import type { Context } from '../context';
import Gallery from '../entities/Gallery';
import {
  addressStringFromPostalAddress,
  graphqlOpeningHoursFromOpeningHours,
  openingTimesFromOpeningHours,
} from '../utilities/gallery';
import FieldError from './FieldError';

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

@InputType()
class AddressInput {
  @Field()
  streetAddress: string;

  @Field({ nullable: true })
  locality: string;

  @Field({ nullable: true })
  city: string;

  @Field({ nullable: true })
  postalCode: string;

  @Field({ nullable: true })
  country: string;
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
class OpeningHoursInput {
  @Field(() => [OpeningHoursRangeInput], { nullable: true })
  openingHoursRanges: OpeningHoursRangeInput[];
}

@InputType()
class CreateGalleryInput {
  @Field()
  name: string;

  @Field(() => AddressInput, { nullable: true })
  postalAddress: AddressInput;

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
class PaginatedGalleries {
  @Field(() => [Gallery])
  galleries: Gallery[];

  @Field()
  hasMore: boolean;
}

@Resolver()
export class GalleryResolver {
  @Query(() => PaginatedGalleries)
  async galleries(@Ctx() { prisma }: Context): Promise<PaginatedGalleries> {
    const galleries = await prisma.gallery.findMany({
      take: 100,
      include: {
        nearestTubes: true,
        address: true,
        openingHours: { include: { openingHoursRanges: true } },
      },
    });

    const galleriesPromise = galleries.map(async (element) => {
      const { id, createdAt, updatedAt, name, address, googleMap, nearestTubes, openingHours } =
        element;

      const tubeStationPromises = nearestTubes.map(async (element) => {
        const { tubeStationId } = element;
        return prisma.tubeStation.findUnique({ where: { id: tubeStationId } });
      });
      const tubeStations = await Promise.all(tubeStationPromises);
      const openingHoursRanges = returnedOpeningHours
        ? await prisma.openingHoursRange.findMany({
            where: { openingHoursId: returnedOpeningHours.id },
            orderBy: { startDay: 'asc' },
          })
        : [];
      return {
        id,
        createdAt,
        updatedAt,
        name,
        address: address ? addressStringFromPostalAddress(address) : null,
        openingHours,
        openingTimes: openingHours ? openingTimesFromOpeningHours(openingHoursRanges) : null,
        postalAddress: address,
        googleMap,
        nearestTubes: tubeStations.filter(notEmpty),
      };
    });
    const galleriesResult = await Promise.all(galleriesPromise);
    return { galleries: galleriesResult, hasMore: false };
  }

  // tube stations must aleady exist
  @Mutation(() => CreateGalleryResponse)
  async createGallery(
    @Arg('input') input: CreateGalleryInput,
    @Ctx() { prisma }: Context,
  ): Promise<CreateGalleryResponse> {
    try {
      const { name, postalAddress, googleMap, nearestTubes, openingHours, website } = input;

      // check gallery does not already exist
      const existingGallery = await prisma.gallery.findFirst({ where: { name } });
      if (existingGallery) {
        return {
          errors: [{ field: 'name', message: 'There is already a gallery with that name.' }],
        };
      }

      // query existing tube stations
      let tubeStationsNotEmpty: TubeStation[] = [];
      if (nearestTubes) {
        const promises = nearestTubes.map((element) =>
          prisma.tubeStation.findUnique({ where: { name: element } }),
        );
        const tubeStations = await Promise.all(promises);
        tubeStationsNotEmpty = tubeStations.filter(notEmpty);
      }

      // create new gallery
      const gallery = await prisma.gallery.create({
        data: {
          name,
          address: {
            create: {
              ...postalAddress,
            },
          },
          openingHours: openingHours
            ? {
                create: {
                  openingHoursRanges: { createMany: { data: openingHours.openingHoursRanges } },
                },
              }
            : undefined,
          googleMap,
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
          nearestTubes: true,
          address: true,
          openingHours: true,
        },
      });

      // map database nearestTubes to GraphQL type
      const {
        nearestTubes: galleryNearestTubes,
        address,
        openingHours: returnedOpeningHours,
        ...rest
      } = gallery;
      const galleryTubeStations = galleryNearestTubes.map((element) => {
        const { tubeStationId } = element;
        return tubeStationsNotEmpty.find((element) => element?.id === tubeStationId);
      });

      const openingHoursRanges = returnedOpeningHours
        ? await prisma.openingHoursRange.findMany({
            where: { openingHoursId: returnedOpeningHours.id },
            orderBy: { startDay: 'asc' },
          })
        : [];

      return {
        gallery: {
          ...rest,
          nearestTubes: galleryTubeStations.filter(notEmpty),
          postalAddress: address,
          address: address ? addressStringFromPostalAddress(address) : null,
          openingHours: returnedOpeningHours
            ? graphqlOpeningHoursFromOpeningHours(openingHoursRanges)
            : null,
          openingTimes: openingHours ? openingTimesFromOpeningHours(openingHoursRanges) : null,
        },
      };
    } catch (error) {
      console.error('Error creating new gallery');
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { GalleryResolver as default };
