import { Field, ObjectType } from 'type-graphql';
import Gallery from './Gallery';
import Photographer from './Photographer';

@ObjectType()
class Exhibition {
  @Field()
  id!: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  name!: string;

  @Field(() => [Photographer], { nullable: true })
  photographers?: Photographer[];

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  summaryText?: string | null;

  @Field(() => [String], { nullable: true })
  hashtags: string[];

  @Field(() => Gallery, { nullable: true })
  gallery?: Gallery;

  @Field(() => String, { nullable: true })
  start?: string;

  @Field(() => String, { nullable: true })
  end?: string;

  @Field(() => Boolean)
  freeEntry: boolean;

  @Field(() => Boolean)
  online: boolean;

  @Field(() => Boolean)
  inPerson: boolean;
}

export { Exhibition as default };
