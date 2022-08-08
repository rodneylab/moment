import argon2 from 'argon2';
import { arg, extendType, inputObjectType, nonNull, objectType, stringArg } from 'nexus';
import { checkRegistration, checkSignature, request as fidoU2fRequest, Request } from 'u2f';
import { NexusGenObjects } from '../../nexus-typegen';
import { Context } from '../context';
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

export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.string('id');
    t.nonNull.field('createdAt', { type: nonNull('Date') });
    t.field('updatedAt', { type: nonNull('Date') });
    t.nonNull.string('username');
    t.nonNull.string('email');
    t.boolean('duoRegistered');
    t.boolean('fidoU2fRegistered');
  },
});

const REGISTRATION_ALLOWED = true;

export const FidoU2fRegistrationDataInput = inputObjectType({
  name: 'FidoU2fRegistrationDataInput',
  definition(t) {
    t.nonNull.string('clientData');
    t.nonNull.string('registrationData');
    t.nonNull.string('version');
  },
});

export const FidoU2fRegisterInput = inputObjectType({
  name: 'FidoU2fRegisterInput',
  definition(t) {
    t.nonNull.string('label');
    t.nonNull.field('registerData', { type: FidoU2fRegistrationDataInput });
  },
});

export const FidoU2fSignResponseInput = inputObjectType({
  name: 'FidoU2fSignResponseInput',
  definition(t) {
    t.nonNull.string('clientData');
    t.nonNull.string('keyHandle');
    t.nonNull.string('signatureData');
  },
});

export const LoginInput = inputObjectType({
  name: 'LoginInput',
  definition(t) {
    t.nonNull.string('username');
    t.nonNull.string('password');
  },
});

export const UsernameEmailPasswordInput = inputObjectType({
  name: 'UsernameEmailPasswordInput',
  definition(t) {
    t.nonNull.string('username');
    t.nonNull.string('email');
    t.nonNull.string('password');
  },
});

export const DuoAuthDevice = objectType({
  name: 'DuoAuthDevice',
  definition(t) {
    t.list.string('capabilities');
    t.string('device');
    t.string('type');
  },
});

export const DuoEnrollResponse = objectType({
  name: 'DuoEnrollResponse',
  definition(t) {
    t.string('qrCode');
    t.string('activationCode');
    t.string('error');
  },
});

export const DuoEnrollStatusResponse = objectType({
  name: 'DuoEnrollStatusResponse',
  definition(t) {
    t.string('result');
    t.string('error');
  },
});

export const DuoPreauthResponse = objectType({
  name: 'DuoPreauthResponse',
  definition(t) {
    t.string('result');
    t.list.field('devices', { type: nonNull('DuoAuthDevice') });
    t.string('error');
  },
});

export const FidoU2fAuthenticateRequest = objectType({
  name: 'FidoU2fAuthenticateRequest',
  definition(t) {
    t.list.string('labels');
    t.list.field('signRequests', { type: nonNull('FidoU2fRegisterRequest') });
    t.string('error');
  },
});

export const FidoU2fRegisterRequest = objectType({
  name: 'FidoU2fRegisterRequest',
  definition(t) {
    t.string('version');
    t.string('appId');
    t.string('challenge');
  },
});

export const UserResponse = objectType({
  name: 'UserResponse',
  definition(t) {
    t.field('user', { type: User });
    t.list.nonNull.field('errors', { type: nonNull('FieldError') });
    t.string('challenge');
  },
});

export const UserQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.string('email', {
      args: {},
      resolve(root, _args, ctx: Context) {
        const { user }: { user: NexusGenObjects['User'] } = root as {
          user: NexusGenObjects['User'];
        };
        const { email, id } = user;
        const { userId } = ctx.session.user;
        return userId === id ? email : '';
      },
    });
    t.nonNull.boolean('duoCheck', {
      args: {},
      resolve() {
        try {
          return duoCheck();
        } catch (error: unknown) {
          console.error(`Error in duoCheck query: ${error as string}`);
          return false;
        }
      },
    });
    t.nonNull.field('duoEnrollStatus', {
      type: DuoEnrollStatusResponse,
      args: { activationCode: nonNull(stringArg()) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { activationCode } = args;
          const { userId } = ctx.session.user;
          if (!userId) {
            return { error: 'Invalid session' };
          }

          const { duoUserId } = (await ctx.db.user.findUnique({ where: { uid: userId } })) ?? {};
          if (!duoUserId) {
            return { error: 'Invalid session' };
          }

          const { error, result } = await duoEnrollStatus({ activationCode, duoUserId });
          return error ? { error: error as string } : { result };
        } catch (error: unknown) {
          console.error(`Error in duoEnrollStatus query: ${error as string}`);
          return { error: error ? (error as string) : 'unknown error' };
        }
      },
    });
    t.boolean('duoPing', {
      async resolve() {
        try {
          return await duoServerPing();
        } catch (error: unknown) {
          console.error(`Error in duoPing query: ${error as string}`);
          return null;
        }
      },
    });
    t.nonNull.field('duoPreauth', {
      type: DuoPreauthResponse,
      async resolve(_root, _args, ctx: Context) {
        try {
          const { userId } = ctx.session.user;
          if (!userId) {
            return { error: 'Invalid session' };
          }
          const { duoUserId, username } =
            (await ctx.db.user.findUnique({ where: { uid: userId } })) ?? {};

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
        } catch (error: unknown) {
          const message = `Error in DuoPreauthResponse query: ${error as string}`;
          console.error(message);
          return { error: message };
        }
      },
    });
    t.nonNull.field('fidoU2fBeginAuthenticate', {
      type: FidoU2fAuthenticateRequest,
      args: {},
      async resolve(_root, _args, ctx: Context) {
        try {
          const { fidoU2fKeys } =
            (await ctx.db.user.findUnique({
              where: { uid: ctx.session.user.userId },
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
          ctx.session.user.fidoU2f = { signRequests };
          return {
            labels,
            signRequests: signRequests.filter(notEmpty),
          };
        } catch (error: unknown) {
          console.error(`Error in fidoU2fBeginAuthenticate query: ${error as string}`);
          return { error: 'Error in fidoU2fBeginAuthenticate query' };
        }
      },
    });
    t.field('fidoU2fBeginRegister', {
      type: FidoU2fRegisterRequest,
      args: {},
      resolve(_root, _args, ctx: Context) {
        try {
          const newFidoU2fRequest = fidoU2fRequest('https://localhost:4000');
          ctx.session.user.fidoU2f = { registerRequests: [newFidoU2fRequest] };
          return newFidoU2fRequest;
        } catch (error: unknown) {
          console.error(`Error in fidoU2fBeginRegister query: ${error as string}`);
          return null;
        }
      },
    });
    t.field('me', {
      type: User,
      args: {},
      async resolve(_root, _args, ctx: Context) {
        try {
          const { user: sessionUser } = ctx.session;
          if (!sessionUser?.userId) return null;

          const { userId } = sessionUser;
          const user = await ctx.db.user.findUnique({
            where: { uid: userId },
            include: { fidoU2fKeys: true },
          });
          return user ? graphqlUser(user) : null;
        } catch (error: unknown) {
          console.error(`Error in me query: ${error as string}`);
          return null;
        }
      },
    });
  },
});

export const UserMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.boolean('duoAuth', {
      args: { device: nonNull(stringArg()) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { userId } = ctx.session.user;
          const { device } = args;

          if (!userId) {
            return false;
          }

          const { duoUserId } = (await ctx.db.user.findUnique({ where: { uid: userId } })) ?? {};
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
            ctx.session.user.mfaAuthenticated = true;
            return true;
          }
          if (message) {
            console.error(`Error in duoAuth: ${message}`);
          }
          if (error) {
            console.error(`Error in duoAuth: ${error}`);
          }
          ctx.session.user.mfaAuthenticated = true;
          return false;
        } catch (error: unknown) {
          console.error(`Error in duoAuth mutation: ${error as string}`);
          return false;
        }
      },
    });
    t.nonNull.field('duoEnroll', {
      type: DuoEnrollResponse,
      args: {},
      async resolve(_root, _args, ctx: Context) {
        try {
          const { userId } = ctx.session.user;
          if (!userId) {
            return { error: 'Invalid session' };
          }

          const { username } = (await ctx.db.user.findUnique({ where: { uid: userId } })) ?? {};
          if (!username) {
            return { error: 'Invalid session' };
          }

          const { duoUserId, error, activationCode, qrCode } = await duoEnroll(username);
          if (error) {
            return { error: error as string };
          }
          await ctx.db.user.update({ where: { uid: userId }, data: { duoUserId } });

          return { activationCode, qrCode };
        } catch (error: unknown) {
          console.error(`Error in duoEnroll query: ${error as string}`);
          return { error: error as string };
        }
      },
    });
    t.nonNull.boolean('fidoU2fCompleteAuthentication', {
      args: { signData: arg({ type: nonNull(FidoU2fSignResponseInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { signData } = args;
          const { keyHandle } = signData;
          const { signRequests } = ctx.session.user.fidoU2f ?? {};
          const signRequest = signRequests?.find((element) => element.keyHandle === keyHandle);
          if (!signRequest) {
            return false;
          }
          const { fidoU2fKeys } =
            (await ctx.db.user.findUnique({
              where: { uid: ctx.session.user.userId },
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
          const checkSignatureResult = checkSignature(signRequest, signData, publicKey);

          if ('successful' in checkSignatureResult) {
            ctx.session.user.mfaAuthenticated = true;
            return true;
          }
          return false;
        } catch (error: unknown) {
          console.error(`Error in fidoU2FRegister mutation: ${error as string}`);
          return false;
        }
      },
    });
    t.nonNull.boolean('fidoU2fAuthenticate', {
      args: { registerInput: arg({ type: nonNull(FidoU2fRegisterInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { registerInput } = args;
          const { registerRequests } = ctx.session.user.fidoU2f ?? {};
          if (!fidoU2fRequest || registerRequests?.length !== 1) {
            return false;
          }

          const { registerData, label } = registerInput;
          const checkRegistrationResult = checkRegistration(registerRequests[0], registerData);

          if ('keyHandle' in checkRegistrationResult) {
            const { keyHandle, publicKey } = checkRegistrationResult;
            const { userId: uid } = ctx.session.user;
            const { id } = (await ctx.db.user.findUnique({ where: { uid } })) ?? {};
            await ctx.db.fidoU2FKey.create({
              data: { keyHandle, publicKey, label, userId: id },
            });
            ctx.session.user.mfaAuthenticated = true;
            return true;
          }
          return false;
        } catch (error: unknown) {
          console.error(`Error in fidoU2FRegister mutation: ${error as string}`);
          return false;
        }
      },
    });
    t.nonNull.boolean('fidoU2fRegister', {
      args: { registerInput: arg({ type: nonNull(FidoU2fRegisterInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { registerRequests } = ctx.session.user.fidoU2f ?? {};
          const { registerInput } = args;
          if (!registerRequests || registerRequests?.length !== 1) {
            return false;
          }

          const { registerData, label } = registerInput;
          // todo(rodneylab): return a field error from this method instead of boolean and pass feedback on
          if (label === '') {
            return false;
          }
          const checkRegistrationResult = checkRegistration(registerRequests[0], registerData);

          if ('keyHandle' in checkRegistrationResult) {
            const { keyHandle, publicKey } = checkRegistrationResult;
            const { userId: uid } = ctx.session.user;
            const { id } = (await ctx.db.user.findUnique({ where: { uid } })) ?? {};
            await ctx.db.fidoU2FKey.create({
              data: { keyHandle, publicKey, label, userId: id },
            });
            ctx.session.user.mfaAuthenticated = true;
            return true;
          }
          return false;
        } catch (error: unknown) {
          console.error(`Error in fidoU2FRegister mutation: ${error as string}`);
          return false;
        }
      },
    });
    t.nonNull.field('login', {
      type: UserResponse,
      args: { credentials: arg({ type: nonNull(LoginInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { credentials } = args;
          const { username, password } = credentials;
          const user = await ctx.db.user.findUnique({
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
          ctx.session.user = { userId: uid, mfaAuthenticated: false };

          return { user: graphqlUser(user) };
        } catch (error: unknown) {
          console.error(`Error in login: ${error as string}`);
          return { errors: [{ field: 'unknown', message: error as string }] };
        }
      },
    });
    t.nonNull.boolean('logout', {
      resolve(_root, _args, ctx: Context) {
        const { session, sessionStore } = ctx;
        const { sessionId, user } = session;
        if (user.userId) {
          sessionStore.destroy(sessionId, (error: unknown) => {
            if (error) {
              console.error(`Error destroying session in logout mutation: ${error as string}`);
              return false;
            } else {
              return true;
            }
          });
        }
        return true;
      },
    });
    t.nonNull.field('register', {
      type: UserResponse,
      args: { registerInput: arg({ type: nonNull(UsernameEmailPasswordInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          if (!REGISTRATION_ALLOWED) {
            return { errors: [{ field: 'email', message: 'you are not authorised to register' }] };
          }
          const { registerInput } = args;
          const errors = validateRegister(registerInput);
          const { email, password, username } = registerInput;
          const trimmedEmail = email.trim();
          const trimmedUsername = username.trim();
          const existingUser = await ctx.db.user.findFirst({
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

          const user = await ctx.db.user.create({
            data: {
              username: trimmedUsername,
              email: trimmedEmail,
              password: hashedPassword,
            },
          });
          const { uid } = user;
          ctx.session.user = { userId: uid, mfaAuthenticated: false };
          return { user: graphqlUser({ ...user, fidoU2fKeys: [] }) };
        } catch (error: unknown) {
          console.error(`Error in register: ${error as string}`);
          return { errors: [{ field: 'unknown', message: error as string }] };
        }
      },
    });
  },
});
