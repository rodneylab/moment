// import { Gallery } from '.prisma/client';
import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import { context } from '../context';
import Gallery from '../entities/Gallery';

@InputType()
class CreateGalleryInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  address: string;

  @Field({ nullable: true })
  googleMap: string;
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
    const galleries = await context.prisma.gallery.findMany({ take: 10 });
    return { galleries, hasMore: false };
  }

  @Mutation(() => Gallery)
  async createGallery(@Arg('input') input: CreateGalleryInput): Promise<Gallery> {
    return context.prisma.gallery.create({
      data: { ...input },
    });
  }
}

export { GalleryResolver as default };
