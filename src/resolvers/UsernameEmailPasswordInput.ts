import { Field, InputType } from 'type-graphql';

@InputType()
class UsernameEmailPasswordInput {
  @Field()
  username: string;

  @Field()
  email: string;

  @Field()
  password: string;
}

export { UsernameEmailPasswordInput as default };
