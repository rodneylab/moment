import { Field, ObjectType } from 'type-graphql';
import FidoU2fRegisterRequest from './FidoU2fRegisterRequest';

@ObjectType()
class FidoU2fSignRequest extends FidoU2fRegisterRequest {
  @Field()
  keyHandle: string;
}

export { FidoU2fSignRequest as default };
