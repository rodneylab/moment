import { Field, ObjectType } from 'type-graphql';
import Exhibition from './Exhibition';
import OpeningHours from './OpeningHours';
import PostalAddress from './PostalAddress';
import TubeStation from './TubeStation';

@ObjectType()
class Location {
  @Field()
  latitude: number;

  @Field()
  longitude: number;
}

@ObjectType()
class Gallery {
  @Field()
  id!: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => PostalAddress, { nullable: true })
  postalAddress?: PostalAddress | null;

  @Field(() => Location, { nullable: true })
  location?: Location | null;

  @Field(() => String, { nullable: true })
  openStreetMap?: string | null;

  @Field(() => String, { nullable: true })
  openingTimes?: String | null;

  @Field(() => OpeningHours, { nullable: true })
  openingHours?: OpeningHours | null;

  @Field(() => [Exhibition], { nullable: true })
  exhibitions: Exhibition[];

  @Field(() => [TubeStation], { nullable: true })
  nearestTubes?: TubeStation[];

  @Field(() => String, { nullable: true })
  tubes?: String;

  @Field(() => String, { nullable: true })
  googleMap?: string | null;

  @Field(() => String, { nullable: true })
  website?: string | null;

  @Field(() => String, { nullable: true })
  websiteUrl?: string | null;
}

export { Gallery as default };
