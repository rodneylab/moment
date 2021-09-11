import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class PostalAddress {
  @Field()
  id!: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  streetAddress: string;

  @Field({ nullable: true })
  locality: string;

  @Field({ nullable: true })
  postalCode: string;

  @Field()
  country: string;
}

export { PostalAddress as default };
