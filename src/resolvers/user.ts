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
import type { Request } from 'u2f';
import { checkRegistration, checkSignature, request as fidoU2fRequest } from 'u2f';
import { Context } from '../context';
import User from '../entities/User';
import {
  duoAuth,
  duoCheck,
  duoEnroll,
  duoEnrollStatus,
  duoPreauth,
  duoServerPing,
  graphqlUser,
  validateRegister,
} from '../utilities/user';
import { notEmpty } from '../utilities/utilities';
import FidoU2fRegisterRequest from './FidoU2fRegisterRequest';
import FieldError from './FieldError';
import UsernameEmailPasswordInput from './UsernameEmailPasswordInput';

const REGISTRATION_ALLOWED = true;

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
  error?: string;
}

@ObjectType()
class DuoEnrollStatusResponse {
  @Field(() => String, { nullable: true })
  result?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
class DuoAuthDevice {
  @Field(() => [String])
  capabilities: string[];

  @Field(() => String)
  device: string;

  @Field(() => String)
  type: string;
}

@ObjectType()
class DuoPreauthResponse {
  @Field(() => String, { nullable: true })
  result?: string;

  @Field(() => [DuoAuthDevice], { nullable: true })
  devices?: DuoAuthDevice[];

  @Field(() => String, { nullable: true })
  error?: string;
}

@InputType()
class FidoU2fRegistrationDataInput {
  @Field(() => String)
  clientData: string;

  @Field(() => String)
  registrationData: string;

  @Field(() => String)
  version: string;
}

@InputType()
class FidoU2fRegisterInput {
  @Field()
  label: string;

  @Field()
  registerData: FidoU2fRegistrationDataInput;
}

@InputType()
class FidoU2fSignResponseInput {
  @Field()
  clientData: string;

  @Field()
  keyHandle: string;

  @Field()
  signatureData: string;
}

@ObjectType()
class FidoU2fAuthenticateRequest {
  @Field(() => [String], { nullable: true })
  labels?: string[];

  @Field(() => [FidoU2fRegisterRequest], { nullable: true })
  signRequests?: Request[];

  @Field({ nullable: true })
  error?: string;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { request }: Context) {
    if (request.session.user.userId === user.id) {
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
      const { userId } = request.session.user;
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
      return await duoServerPing();
    } catch (error) {
      console.error(`Error in duoPing query: ${error}`);
      return null;
    }
  }

  @Query(() => DuoPreauthResponse)
  async duoPreauth(@Ctx() { prisma, request }: Context): Promise<DuoPreauthResponse> {
    try {
      const { userId } = request.session.user;
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

  @Query(() => FidoU2fAuthenticateRequest, { nullable: true })
  async fidoU2fBeginAuthenticate(
    @Ctx() { prisma, request }: Context,
  ): Promise<FidoU2fAuthenticateRequest | null> {
    try {
      const { fidoU2fKeys } =
        (await prisma.user.findUnique({
          where: { uid: request.session.user.userId },
          include: { fidoU2fKeys: true },
        })) ?? {};
      if (!fidoU2fKeys || fidoU2fKeys.length === 0) {
        return { error: 'No key available to authenticate' };
      }

      const labels: string[] = [];
      const signRequests: Request[] = [];
      fidoU2fKeys?.forEach((element) => {
        labels.push(element.label === '' ? 'no name' : element.label);
        signRequests.push(fidoU2fRequest('https://localhost:4000', element.keyHandle));
      });
      request.session.user.fidoU2f = { signRequests };
      return {
        labels,
        signRequests: signRequests.filter(notEmpty),
      };
    } catch (error) {
      console.error(`Error in fidoU2fBeginAuthenticate query: ${error}`);
      return { error: 'Error in fidoU2fBeginAuthenticate query' };
    }
  }

  @Query(() => FidoU2fRegisterRequest, { nullable: true })
  async fidoU2fBeginRegister(@Ctx() { request }: Context): Promise<FidoU2fRegisterRequest | null> {
    try {
      const newFidoU2fRequest = fidoU2fRequest('https://localhost:4000');
      request.session.user.fidoU2f = { registerRequests: [newFidoU2fRequest] };
      return newFidoU2fRequest;
    } catch (error) {
      console.error(`Error in fidoU2fBeginRegister query: ${error}`);
      return null;
    }
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { prisma, request }: Context) {
    try {
      const { user: sessionUser } = request.session;
      if (!sessionUser?.userId) {
        return null;
      }
      const { userId } = sessionUser;
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
  ): Promise<boolean> {
    try {
      const { userId } = request.session.user;
      if (!userId) {
        return false;
      }

      const { duoUserId } = (await prisma.user.findUnique({ where: { uid: userId } })) ?? {};
      if (!duoUserId) {
        return false;
      }

      // todo(rodneylab): add device info to context to save additional preauth
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
        request.session.user.mfaAuthenticated = true;
        return true;
      }
      if (message) {
        console.error(`Error in duoAuth: ${message}`);
      }
      if (error) {
        console.error(`Error in duoAuth: ${error}`);
      }
      request.session.user.mfaAuthenticated = true;
      return false;
    } catch (error) {
      console.error(`Error in duoAuth mutation: ${error}`);
      return false;
    }
  }

  @Mutation(() => DuoEnrollResponse)
  async duoEnroll(@Ctx() { prisma, request }: Context): Promise<DuoEnrollResponse> {
    try {
      const { userId } = request.session.user;
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
  async fidoU2fCompleteAuthentication(
    @Arg('signData') signData: FidoU2fSignResponseInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<boolean> {
    try {
      const { keyHandle } = signData;
      const { signRequests } = request.session.user.fidoU2f ?? {};
      const signRequest = signRequests?.find((element) => element.keyHandle === keyHandle);
      if (!signRequest) {
        return false;
      }
      const { fidoU2fKeys } =
        (await prisma.user.findUnique({
          where: { uid: request.session.user.userId },
          include: { fidoU2fKeys: true },
        })) ?? {};
      if (!fidoU2fKeys) {
        return false;
      }
      const fidoU2fKey = fidoU2fKeys.find((element) => element.keyHandle === keyHandle);
      if (!fidoU2fKey) {
        return false;
      }
      const { publicKey } = fidoU2fKey;
      // const { successful } = checkSignature(signRequest, signData, publicKey);
      const checkSignatureResult = checkSignature(signRequest, signData, publicKey);

      if ('successful' in checkSignatureResult) {
        request.session.user.mfaAuthenticated = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error in fidoU2FRegister mutation: ${error}`);
      return false;
    }
  }

  @Mutation(() => Boolean)
  async fidoU2fAuthenticate(
    @Arg('registerInput') input: FidoU2fRegisterInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<boolean> {
    try {
      const { registerRequests } = request.session.user.fidoU2f ?? {};
      if (!fidoU2fRequest || registerRequests?.length !== 1) {
        return false;
      }

      const { registerData, label } = input;
      // const { keyHandle, publicKey } = checkRegistration(registerRequests[0], registerData);
      const checkRegistrationResult = checkRegistration(registerRequests[0], registerData);

      if ('keyHandle' in checkRegistrationResult) {
        const { keyHandle, publicKey } = checkRegistrationResult;
        const { userId: uid } = request.session.user;
        const { id } = (await prisma.user.findUnique({ where: { uid } })) ?? {};
        await prisma.fidoU2FKey.create({ data: { keyHandle, publicKey, label, userId: id } });
        request.session.user.mfaAuthenticated = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error in fidoU2FRegister mutation: ${error}`);
      return false;
    }
  }

  @Mutation(() => Boolean)
  async fidoU2fRegister(
    @Arg('registerInput') input: FidoU2fRegisterInput,
    @Ctx() { prisma, request }: Context,
  ): Promise<boolean> {
    try {
      const { registerRequests } = request.session.user.fidoU2f ?? {};
      if (!registerRequests || registerRequests?.length !== 1) {
        return false;
      }

      const { registerData, label } = input;
      // todo(rodneylab): return a field error from this method instead of boolean and pass feedback on
      if (label === '') {
        return false;
      }
      // const { keyHandle, publicKey } = checkRegistration(registerRequests[0], registerData) ?? {};
      const checkRegistrationResult = checkRegistration(registerRequests[0], registerData);

      if ('keyHandle' in checkRegistrationResult) {
        const { keyHandle, publicKey } = checkRegistrationResult;
        const { userId: uid } = request.session.user;
        const { id } = (await prisma.user.findUnique({ where: { uid } })) ?? {};
        await prisma.fidoU2FKey.create({ data: { keyHandle, publicKey, label, userId: id } });
        request.session.user.mfaAuthenticated = true;
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
        where: { username: username.trim() },
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

      const valid = await argon2.verify(user.password, password.trim(), {
        type: argon2.argon2id,
        memoryCost: 524_288,
        parallelism: 1,
        timeCost: 3,
      });
      if (!valid) {
        return credentialErrors;
      }
      const { uid } = user;
      request.session.user = { userId: uid, mfaAuthenticated: false };

      return { user: graphqlUser(user) };
    } catch (error) {
      console.error(`Error in login: ${error}`);
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { request }: Context) {
    if (request.session.user.userId) {
      request.session.destroy((error) => {
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
      if (!REGISTRATION_ALLOWED) {
        return { errors: [{ field: 'email', message: 'you are not authorised to register' }] };
      }
      const errors = validateRegister(registerInput);
      const { email, password, username } = registerInput;
      const trimmedEmail = email.trim();
      const trimmedUsername = username.trim();
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username: trimmedUsername }, { email: trimmedEmail }] },
      });
      if (existingUser) {
        if (existingUser.email === trimmedEmail) {
          errors.push({ field: 'email', message: 'email already exists' });
          return { errors };
        }
        if (existingUser.username === trimmedUsername) {
          errors.push({ field: 'username', message: 'username already exists' });
        }
      }
      if (errors.length > 0) {
        return { errors };
      }

      const hashedPassword = await argon2.hash(password.trim(), {
        type: argon2.argon2id,
        memoryCost: 524_288,
        parallelism: 1,
        timeCost: 3,
      });

      const user = await prisma.user.create({
        data: {
          username: trimmedUsername,
          email: trimmedEmail,
          password: hashedPassword,
        },
      });
      const { uid } = user;
      request.session.user = { userId: uid, mfaAuthenticated: false };
      return { user: graphqlUser({ ...user, fidoU2fKeys: [] }) };
    } catch (error) {
      console.error(`Error in register: ${error}`);
      return { errors: [{ field: 'unknown', message: error }] };
    }
  }
}

export { UserResolver as default };
