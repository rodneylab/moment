import { Field, ObjectType } from 'type-graphql';
import OpeningHoursRange from './OpeningHoursRange';

@ObjectType()
class OpeningHours {
  @Field(() => [OpeningHoursRange], { nullable: true })
  openingHoursRanges?: OpeningHoursRange[] | null;
}

export { OpeningHours as default };
