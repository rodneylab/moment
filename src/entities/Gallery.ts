import { Field, ObjectType } from 'type-graphql';
import OpeningHours from './OpeningHours';
// import OpeningHoursRange from './OpeningHoursRange';
import PostalAddress from './PostalAddress';
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

  @Field(() => PostalAddress, { nullable: true })
  postalAddress?: PostalAddress | null;

  @Field(() => String, { nullable: true })
  openingTimes?: String | null;

  @Field(() => OpeningHours, { nullable: true })
  openingHours?: OpeningHours | null;

  @Field(() => [TubeStation], { nullable: true })
  nearestTubes?: TubeStation[];

  @Field(() => String, { nullable: true })
  googleMap?: string | null;

  @Field(() => String, { nullable: true })
  website?: string | null;
}

export { Gallery as default };
