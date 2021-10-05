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
// @ts-ignore
import { checkRegistration, request as fidoU2FRequest } from 'u2f';
import { Context } from '../context';
import User from '../entities/User';
import {
  duoAuth,
  duoCheck,
  duoEnroll,
  duoEnrollStatus,
  duoPing,
  duoPreauth,
  graphqlUser,
  validateRegister,
} from '../utilities/user';
import FidoU2FRequest from './FidoU2fRequest';
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

@ObjectType()
class DuoEnrollResponse {
  @Field(() => String, { nullable: true })
  qrCode?: string;

  @Field(() => String, { nullable: true })
  activationCode?: string;

  @Field(() => String, { nullable: true })
  error?: String;
}

@ObjectType()
class DuoEnrollStatusResponse {
  @Field(() => String, { nullable: true })
  result?: string;

  @Field(() => String, { nullable: true })
  error?: String;
}

@ObjectType()
class DuoAuthDevice {
  @Field(() => [String])
  capabilities: string[];

  @Field(() => String)
  device: string;

  @Field(() => String)
  type: String;
}

@ObjectType()
class DuoPreauthResponse {
  @Field(() => String, { nullable: true })
  result?: string;

  @Field(() => [DuoAuthDevice], { nullable: true })
  devices?: DuoAuthDevice[];

  @Field(() => String, { nullable: true })
  error?: String;
}

@InputType()
class FidoU2fRegistrationDataInput {
  @Field(() => String)
  clientData: string;

  @Field(() => String)
  registrationData: string;

  @Field(() => String)
  version: String;
}

@InputType()
class FidoU2fRegisterInput {
  @Field()
  label: string;

  @Field()
  registerData: FidoU2fRegistrationDataInput;
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

  @Query(() => Boolean)
  async duoCheck() {
    try {
      return duoCheck();
    } catch (error) {
      console.error(`Error in duoCheck query: ${error}`);
      return null;
    }
  }

  @Query(() => DuoEnrollStatusResponse)
  async duoEnrollStatus(
    @Arg('activationCode') activationCode: string,
    @Ctx() { prisma, request }: Context,
  ): Promise<DuoEnrollStatusResponse> {
    try {
      const { userId } = request.session;
      if (!userId) {
        return { error: 'Invalid session' };
      }

      const { duoUserId } = (await prisma.user.findUnique({ where: { uid: userId } })) ?? {};
      if (!duoUserId) {
        return { error: 'Invalid session' };
      }

      const { error, result } = await duoEnrollStatus({ activationCode, duoUserId });
      return error ? { error } : { result };
    } catch (error) {
      console.error(`Error in duoEnrollStatus query: ${error}`);
      return { error };
    }
  }

  @Query(() => Boolean)
  async duoPing() {
    try {
      return duoPing();
    } catch (error) {
      console.error(`Error in duoEnrollStatus query: ${error}`);
      return null;
    }
  }

  @Query(() => FidoU2FRequest, { nullable: true })
  async fidoU2FBeginRegister(): Promise<FidoU2FRequest | null> {
    try {
      return fidoU2FRequest('https://localhost:4000');
    } catch (error) {
      console.error(`Error in duoEnrollStatus query: ${error}`);
      return null;
    }
  }

  @Query(() => DuoPreauthResponse)
  async duoPreauth(@Ctx() { prisma, request }: Context): Promise<DuoPreauthResponse> {
    try {
      const { userId } = request.session;
      if (!userId) {
        return { error: 'Invalid session' };
      }
      const { duoUserId, username } =
        (await prisma.user.findUnique({ where: { uid: userId } })) ?? {};

      if (username && typeof duoUserId !== 'undefined') {
        const { devices, result } = await duoPreauth({ duoUserId, username });
        if (result === 'auth' || result === 'enroll') {
          return {
            result,
            devices: devices?.filter((element) => element.capabilities.includes('push')),
          };
        }
      }
      return { error: 'Duo auth not allowed for user' };
    } catch (error) {
      const message = `Error in DuoPreauthResponse query: ${error}`;
      console.error(message);
      return { error: message };
    }
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { prisma, request }: Context) {
    try {
      const { userId } = request.session;
      if (!userId) {
        return null;
      }
      const user = await prisma.user.findUnique({
        where: { uid: userId },
        include: { fidoU2fKeys: true },
      });
      return user ? graphqlUser(user) : null;
    } catch (error) {
      console.error(`Error in me query: ${error}`);
      return null;
    }
  }

  @Mutation(() => Boolean)
  async duoAuth(
    @Arg('device') device: string,
    @Ctx() { prisma, request }: Context,
  ): Promise<Boolean> {
    try {
      const { userId } = request.session;
      if (!userId) {
        return false;
      }

      const { duoUserId } = (await prisma.user.findUnique({ where: { uid: userId } })) ?? {};
      if (!duoUserId) {
        return false;
      }

      // todo(rodneyj): add device info to context to save additional preauth
      const { devices } = await duoPreauth({ duoUserId });

      if (
        !devices?.some(
          (element) => element.capabilities.includes('push') && element.device === device,
        )
      ) {
        return false;
      }
      const { allow, error, message } = await duoAuth({ duoUserId, device });
      if (allow) {
        request.session.mfaAuthenticated = true;
        return true;
      }
      if (message) {
        console.error(`Error in duoAuth: ${message}`);
      }
      if (error) {
        console.error(`Error in duoAuth: ${error}`);
      }
      request.session.mfaAuthenticated = true;
      return false;
    } catch (error) {
      console.error(`Error in duoAuth mutation: ${error}`);
      return false;
    }
  }

  @Mutation(() => DuoEnrollResponse)
  async duoEnroll(@Ctx() { prisma, request }: Context): Promise<DuoEnrollResponse> {
    try {
      const { userId } = request.session;
      if (!userId) {
        return { error: 'Invalid session' };
      }

      const { username } = (await prisma.user.findUnique({ where: { uid: userId } })) ?? {};
      if (!username) {
        return { error: 'Invalid session' };
      }

      const { duoUserId, error, activationCode, qrCode } = await duoEnroll(username);
      if (error) {
        return { error };
      }
      await prisma.user.update({ where: { uid: userId }, data: { duoUserId } });

      return { activationCode, qrCode };
    } catch (error) {
      console.error(`Error in duoEnroll query: ${error}`);
      return { error };
    }
  }

  @Mutation(() => Boolean)
  async fidoU2FRegister(
    @Arg('registerInput') input: FidoU2fRegisterInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<boolean> {
    try {
      const { request: fidoU2fRequest } = request.session.user.fidoU2F;
      const { registerData, label } = input;
      const { keyHandle, publicKey } = checkRegistration(fidoU2fRequest, registerData);

      if (keyHandle && publicKey) {
        const { userId: uid } = request.session;
        const { id } = (await prisma.user.findUnique({ where: { uid } })) ?? {};
        await prisma.fidoU2FKey.create({ data: { keyHandle, publicKey, label, userId: id } });
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error in fidoU2FRegister mutation: ${error}`);
      return false;
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('credentials') credentials: LoginInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<UserResponse> {
    try {
      const { username, password } = credentials;
      const user = await prisma.user.findUnique({
        where: { username },
        include: { fidoU2fKeys: true },
      });

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
    if (request.session.userId) {
      request.destroySession((error) => {
        if (error) {
          console.error(`Error destroying session in logout mutation: ${error}`);
          return false;
        } else {
          return true;
        }
      });
    }
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
      return { user: graphqlUser({ ...user, fidoU2fKeys: [] }) };
    } catch (error) {
      console.error(`Error in register: ${error}`);
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { UserResolver as default };
