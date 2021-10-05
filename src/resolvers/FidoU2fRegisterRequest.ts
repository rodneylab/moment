import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class FidoU2fRegisterRequest {
  @Field()
  version: string;

  @Field()
  appId: string;

  @Field()
  challenge: string;
}

export { FidoU2fRegisterRequest as default };
