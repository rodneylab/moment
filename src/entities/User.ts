import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class User {
  @Field(() => String)
  createdAt: Date;

  @Field(() => String)
  updatedAt: Date;

  @Field()
  id!: string;

  @Field()
  username!: string;

  @Field()
  email!: string;
}

export { User as default };
