import { Field, InputType } from 'type-graphql';

@InputType()
class AddressInput {
  @Field()
  streetAddress: string;

  @Field({ nullable: true })
  locality: string;

  @Field({ nullable: true })
  city: string;

  @Field({ nullable: true })
  postalCode: string;

  @Field({ nullable: true })
  country: string;
}

export { AddressInput as default };
