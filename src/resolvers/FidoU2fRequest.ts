import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class FidoU2fRequest {
  @Field()
  version: string;

  @Field()
  appId: string;

  @Field()
  challenge: string;
}

export { FidoU2fRequest as default };
