import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { validSlug } from '../../src/utilities/utilities';

test('validSlug', () => {
  assert.type(validSlug, 'function');
  assert.is(validSlug('a-valid-slug').length, 0);
  assert.is(validSlug('another-valid-slug', 'slug').length, 0);
  assert.is(validSlug('another-1-valid-slug-1', 'slug').length, 0);
  assert.is(validSlug('an-Invalid-slug').length, 1);
  assert.is(validSlug('-another-invalid-slug').length, 1);
  assert.is(validSlug('yet-another-invalid-slug-').length, 1);

  const { field, message } = validSlug('an-Invalid-slug')[0];
  assert.is(field, 'slug');
  assert.is(message, 'Check the slug is valid');
});

test.run();
