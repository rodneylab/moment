import { Field, ObjectType } from 'type-graphql';
import Gallery from './Gallery';


@ObjectType()
class TubeStation {
	@Field()
	id!: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field()
	name!: string;

	@Field(() => [Gallery], { nullable: true})
	gallery: Gallery[];
}

export { TubeStation as default };
