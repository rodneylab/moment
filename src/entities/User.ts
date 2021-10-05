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

  @Field()
  duoRegistered: boolean;

  @Field()
  fidoU2fRegistered: boolean;
}

export { User as default };
