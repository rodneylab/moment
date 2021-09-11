import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class OpeningHoursRange {
  @Field()
  id!: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  startDay: number;

  @Field()
  endDay: number;

  @Field()
  openingTime: string;

  @Field()
  closingTime: string;
}

export { OpeningHoursRange as default };
