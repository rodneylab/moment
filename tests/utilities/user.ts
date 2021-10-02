import { test } from 'uvu';
import * as assert from 'uvu/assert';
import {
  dbUser,
  registerInputComplexPassword,
  registerInputLongUsernameNoEmailShortPassword,
  registerInputNonComplexPassword,
  registerInputNoPassword,
  registerInputNoUsernameNonComplexPassword,
  registerInputShortUsernameInvalidEmailLongPassword,
  registerInputValid,
} from '../../fixtures/utilities/user';
import { graphqlUser, validateRegister } from '../../src/utilities/user';

test.before.each((meta) => {
  console.log(meta['__test__']);
});

test('it returns user from graphqlUser', () => {
  assert.type(graphqlUser, 'function');
  assert.snapshot(
    JSON.stringify(graphqlUser(dbUser)),
    '{"id":"cku00k400w1rl1erlb5k37hdx","createdAt":"2021-10-01T03:37:11.000Z","updatedAt":"2021-10-01T03:37:11.000Z","username":"matthew","email":"matthew@email.com"}',
  );
});

test('it validates valid register inputs correctly', () => {
  assert.is(validateRegister(registerInputValid).length, 0);
});

test('it validates register inputs with short username, invalid email, long password corectly', () => {
  const errors = validateRegister(registerInputShortUsernameInvalidEmailLongPassword);
  assert.is(errors.length, 3);
  assert.is(
    errors.some(
      (element) =>
        element.field === 'username' && element.message === 'Username should be a little longer',
    ),
    true,
  );
  assert.is(
    errors.some(
      (element) => element.field === 'email' && element.message === 'Check the email address',
    ),
    true,
  );
  assert.is(
    errors.some(
      (element) =>
        element.field === 'password' && element.message === 'Password should be a little shorter',
    ),
    true,
  );
});

test('it validates register inputs with short username, invalid email, long password corectly', () => {
  const errors = validateRegister(registerInputLongUsernameNoEmailShortPassword);
  assert.is(errors.length, 3);
  assert.is(
    errors.some(
      (element) =>
        element.field === 'username' && element.message === 'Username should be a little shorter',
    ),
    true,
  );
  assert.is(
    errors.some(
      (element) => element.field === 'email' && element.message === 'Check the email address',
    ),
    true,
  );
  assert.is(
    errors.some(
      (element) =>
        element.field === 'password' && element.message === 'Password should be a little longer',
    ),
    true,
  );
});

test('it validates register inputs with no username, non-complex password corectly', () => {
  const errors = validateRegister(registerInputNoUsernameNonComplexPassword);
  assert.is(errors.length, 3);
  assert.is(
    errors.some(
      (element) =>
        element.field === 'username' && element.message === 'Username should be a little longer',
    ),
    true,
  );
  assert.is(
    errors.some(
      (element) =>
        element.field === 'username' &&
        element.message ===
          'Could you choose a username with only letters, numbers, underscores and hyphens?',
    ),
    true,
  );
  assert.is(
    errors.some(
      (element) =>
        element.field === 'password' &&
        element.message === 'Password should be a little more complex',
    ),
    true,
  );
});

test('it validates register inputs with, non-complex password corectly', () => {
  const errors = validateRegister(registerInputNonComplexPassword);
  assert.is(errors.length, 1);
  assert.is(errors[0].field, 'password');
  assert.is(errors[0].message, 'Password should be a little more complex');
});

test('it validates register inputs with, complex password corectly', () => {
  assert.is(validateRegister(registerInputComplexPassword).length, 0);
});

test('it validates register inputs with, missing password corectly', () => {
  const errors = validateRegister(registerInputNoPassword);
  assert.is(errors.length, 2);
  assert.is(
    errors.some(
      (element) =>
        element.field === 'password' && element.message === 'Password should be a little longer',
    ),
    true,
  );
  assert.is(
    errors.some(
      (element) =>
        element.field === 'password' &&
        element.message === 'Password should be a little more complex',
    ),
    true,
  );
});

test.run();
