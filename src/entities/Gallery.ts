import { Field, ObjectType } from 'type-graphql';
import TubeStation from './TubeStation';

@ObjectType()
class Gallery {
  @Field()
  id!: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  name!: string;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => [TubeStation], { nullable: true })
  nearestTubes?: TubeStation[];

  @Field(() => String, { nullable: true })
  googleMap?: string | null;
}

export { Gallery as default };
