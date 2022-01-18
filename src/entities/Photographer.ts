import { Field, ObjectType } from 'type-graphql';
import Exhibition from './Exhibition';

@ObjectType()
class Photographer {
  @Field()
  id!: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => String, { nullable: true })
  firstName?: string | null;

  @Field(() => String, { nullable: true })
  lastName?: string | null;

  @Field(() => String, { nullable: true })
  otherNames?: string | null;

  @Field(() => String)
  name: string;

  @Field(() => String)
  slug!: string;

  @Field(() => [Exhibition], { nullable: true })
  exhibitions: Exhibition[];

  @Field(() => String, { nullable: true })
  website?: string | null;

  @Field(() => String, { nullable: true })
  websiteUrl?: string | null;
}

export { Photographer as default };
