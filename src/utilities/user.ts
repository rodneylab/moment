import type { User } from '.prisma/client';
import type GraphQLUser from '../entities/User';
import FieldError from '../resolvers/FieldError';
import type UsernameEmailPasswordInput from '../resolvers/UsernameEmailPasswordInput';

export function graphqlUser(user: User): GraphQLUser {
  const { createdAt, updatedAt, uid: id, username, email } = user;
  return { id, createdAt, updatedAt, username, email };
}

export function validateRegister(options: UsernameEmailPasswordInput) {
  const result: FieldError[] = [];
  const { email, password, username } = options;
  const passwordLength = password.length;
  const usernameLength = username.length;

  const emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (!emailRegex.test(email)) {
    result.push({ field: 'email', message: 'Check the email address' });
  }

  if (usernameLength < 8) {
    result.push({ field: 'username', message: 'Username should be a little longer' });
  }
  if (usernameLength > 128) {
    result.push({ field: 'username', message: 'Username should be a little shorter' });
  }
  if (!/^[A-Z,a-z,0-9,-,_]+$/.test(username)) {
    result.push({
      field: 'username',
      message: 'Could you choose a username with only letters, numbers, underscores and hyphens?',
    });
  }
  if (passwordLength < 20) {
    result.push({ field: 'password', message: 'Password should be a little longer' });
  }
  if (passwordLength > 128) {
    result.push({ field: 'password', message: 'Password should be a little shorter' });
  }
  if (
    passwordLength < 23 &&
    (!/[a-z]+/.test(password) ||
      !/[A-Z]+/.test(password) ||
      !/\d+/.test(password) ||
      !/[ !"#$%&'()*+,\-\./:;<=>?@[\\\]\^_`{|}~]+/.test(password))
  ) {
    result.push({ field: 'password', message: 'Password should be a more complex' });
  }

  return result;
}
