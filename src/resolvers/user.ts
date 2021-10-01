import argon2 from 'argon2';
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from 'type-graphql';
import { Context } from '../context';
import User from '../entities/User';
import { graphqlUser, validateRegister } from '../utilities/user';
import FieldError from './FieldError';
import UsernameEmailPasswordInput from './UsernameEmailPasswordInput';

@InputType()
class LoginInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class UserResponse {
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { request }: Context) {
    if (request.session.userId === user.id) {
      return user.email;
    }
    return '';
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { prisma, request }: Context) {
    try {
      const { userId } = request.session;
      if (!userId) {
        return null;
      }
      const user = await prisma.user.findUnique({ where: { uid: userId } });
      return user ? graphqlUser(user) : null;
    } catch (error) {
      console.error(`Error in me query: ${error}`);
      return null;
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('credentials') credentials: LoginInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<UserResponse> {
    try {
      const { username, password } = credentials;
      const user = await prisma.user.findUnique({ where: { username } });

      const credentialErrors = {
        errors: [
          { field: 'username', message: 'check username and password' },
          { field: 'password', message: 'check username and password' },
        ],
      };
      if (!user) {
        return credentialErrors;
      }

      const valid = await argon2.verify(user.password, password, {
        type: argon2.argon2id,
        memoryCost: 524_288,
        parallelism: 1,
        timeCost: 3,
      });
      if (!valid) {
        return credentialErrors;
      }
      const { uid } = user;
      request.session.userId = uid;

      return { user: graphqlUser(user) };
    } catch (error) {
      console.error(`Error in login: ${error}`);
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { request }: Context) {
    const { session, sessionStore } = request;
    const { sessionId } = session;
    sessionStore.destroy(sessionId, (error) => {
      if (error) {
        console.error(`Error in logout mutation: ${error}`);
        return false;
      }
      return true;
    });
    return true;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('registerInput') registerInput: UsernameEmailPasswordInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<UserResponse> {
    try {
      const errors = validateRegister(registerInput);
      const { email, password, username } = registerInput;
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
      });
      if (existingUser) {
        if (existingUser.email === email) {
          errors.push({ field: 'email', message: 'email already exists' });
          return { errors };
        }
        if (existingUser.username === username) {
          errors.push({ field: 'username', message: 'username already exists' });
        }
      }
      if (errors.length > 0) {
        return { errors };
      }

      const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 524_288,
        parallelism: 1,
        timeCost: 3,
      });

      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
        },
      });
      const { uid } = user;
      request.session.userId = uid;
      return { user: graphqlUser(user) };
    } catch (error) {
      console.error(`Error in register: ${error}`);
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { UserResolver as default };
