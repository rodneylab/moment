import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import { context } from '../context';
import Gallery from '../entities/Gallery';
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
  ranges: OpeningHoursRangeInput[];
}

@InputType()
class CreateGalleryInput {
  @Field()
  name: string;

  @Field(() => AddressInput, { nullable: true })
  postalAddress: AddressInput;

  @Field(() => OpeningHoursInput, { nullable: true })
  openingHours: OpeningHoursInput[];

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
  async galleries(): Promise<PaginatedGalleries> {
    const galleries = await context.prisma.gallery.findMany({
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
      // todo(rodneyj): move this to a utility function
      let addressString;
      if (address) {
        const { streetAddress, locality, postalCode } = address;
        addressString = [streetAddress, locality, postalCode]
          .filter((element) => element)
          .join(', ');
      }
      // todo(rodneyj): move this to a utility function
      let openingTimes: string[] = [];
      if (openingHours) {
        const { openingHoursRanges } = openingHours;
        openingHoursRanges.map((element) => {
          const { startDay, endDay, openingTime, closingTime } = element;
          return `${openingTime} to ${closingTime} ${startDay} to ${endDay}`;
        });
      }
      const tubeStationPromises = nearestTubes.map(async (element) => {
        const { tubeStationId } = element;
        return context.prisma.tubeStation.findUnique({ where: { id: tubeStationId } });
      });
      const tubeStations = await Promise.all(tubeStationPromises);
      return {
        id,
        createdAt,
        updatedAt,
        name,
        address: addressString,
        openingHours,
        openingTimes: openingTimes.filter(notEmpty).join(', '),
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
  async createGallery(@Arg('input') input: CreateGalleryInput): Promise<CreateGalleryResponse> {
    try {
      const { name, postalAddress, googleMap, nearestTubes, openingHours, website } = input;

      // check gallery does not already exist
      const existingGallery = await context.prisma.gallery.findFirst({ where: { name } });
      if (existingGallery) {
        return {
          errors: [{ field: 'name', message: 'There is already a gallery with that name.' }],
        };
      }

      // query existing tube stations
      const promises = nearestTubes.map((element) =>
        context.prisma.tubeStation.findUnique({ where: { name: element } }),
      );
      const tubeStations = await Promise.all(promises);
      const tubeStationsNotEmpty = tubeStations.filter(notEmpty);

      // create new gallery
      const gallery = await context.prisma.gallery.create({
        data: {
          name,
          address: {
            create: {
              ...postalAddress,
            },
          },
          openingHours: {
            create: { ...openingHours },
          },
          googleMap,
          nearestTubes: {
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
        },
      });

      // map database nearestTubes to GraphQL type
      const { nearestTubes: galleryNearestTubes, address, ...rest } = gallery;
      const galleryTubeStations = galleryNearestTubes.map((element) => {
        const { tubeStationId } = element;
        return tubeStationsNotEmpty.find((element) => element?.id === tubeStationId);
      });
      return {
        gallery: {
          ...rest,
          nearestTubes: galleryTubeStations.filter(notEmpty),
          postalAddress: address,
        },
      };
    } catch (error) {
      console.error('Error creating new gallery');
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { GalleryResolver as default };
