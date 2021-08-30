import { Resolver, Query } from 'type-graphql';

@Resolver()
export class HelloResolver {
  @Query(() => String)
  hello() {
    return 'Hello everybody!';
  }
}

export { HelloResolver as default };
