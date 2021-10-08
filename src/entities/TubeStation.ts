import { Field, ObjectType } from 'type-graphql';
import Gallery from './Gallery';

@ObjectType()
class TubeStation {
  @Field()
  id!: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  name!: string;

  @Field()
  slug: string;

  @Field(() => [Gallery], { nullable: true })
  galleries?: Gallery[];
}

export { TubeStation as default };
