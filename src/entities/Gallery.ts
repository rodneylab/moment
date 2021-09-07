import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class Gallery {
	@Field()
	id!: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field({nullable: true})
	name!: string;

	@Field({nullable: true})
	address: string;

	// @Field(() => [TubeStation], { nullable: true})
	// nearestTubes: TubeStation[];

	@Field()
	googleMap: string;
}

export { Gallery as default };


