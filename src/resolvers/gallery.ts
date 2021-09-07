// import { Gallery } from '.prisma/client';
import { Field, ObjectType, Query, Resolver } from 'type-graphql';
import { context } from '../context';
import Gallery from '../entities/Gallery';

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
    const galleries = await context.prisma.gallery.findMany({ take: 10 });
    return { galleries, hasMore: false };
  }
}

export { GalleryResolver as default };
