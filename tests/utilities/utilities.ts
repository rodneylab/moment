import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { validSlug, validUrl } from '../../src/utilities/utilities';

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

test('it correctly validates urls', () => {
  assert.type(validUrl, 'function');
  assert.is(validUrl('https://www.example.com', 'url').length, 0);
  assert.is(validUrl('https://www.example.com/home', 'url').length, 0);
  assert.is(validUrl('https://www.example.com/home-page', 'url').length, 0);
  assert.is(validUrl('https://www.example.gallery/home-page', 'url').length, 0);

  const errors = validUrl('https://www.exampleerror', 'url');
  const { field, message } = errors[0];
  assert.is(errors.length, 1);
  assert.is(field, 'url');
  assert.is(message, 'Check this is a valid url');
});

test.run();
