import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

export { FieldError as default };
