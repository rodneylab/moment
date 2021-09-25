import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { address1, openingHours1 } from '../fixtures/utilities/gallery';
import {
  addressStringFromPostalAddress,
  openingTimesFromOpeningHours,
  validName,
  validSlug,
} from '../src/utilities/gallery';

test('addressStringFromPostalAddress', () => {
  assert.type(addressStringFromPostalAddress, 'function');
  assert.is(addressStringFromPostalAddress(address1), '16–18 Berners Street, Fitzrovia, W1T 3LN');
});

test('openingTimesFromOpeningHours', () => {
  assert.type(openingTimesFromOpeningHours, 'function');
  assert.is(
    openingTimesFromOpeningHours(openingHours1),
    'Monday to Friday 09:00–17:00, Saturdays 10:00–18:00',
  );
});

test('validName', () => {
  assert.type(validName, 'function');
  assert.is(validName('John', 'name').length, 0);
  assert.is(validName('John\n', 'name').length, 1);

  const { field, message } = validName('John\t', 'name')[0];
  assert.is(field, 'name');
  assert.is(message, 'name contains invalid characters');
});

test('validSlug', () => {
  assert.type(validSlug, 'function');
  assert.is(validSlug('a-valid-slug').length, 0);
  assert.is(validSlug('another-valid-slug', 'slug').length, 0);
  assert.is(validSlug('an-Invalid-slug').length, 1);
  assert.is(validSlug('-another-invalid-slug').length, 1);
  assert.is(validSlug('yet-another-invalid-slug-').length, 1);

  const { field, message } = validSlug('an-Invalid-slug')[0];
  assert.is(field, 'slug');
  assert.is(message, 'Check the slug is valid');
});

test.run();
