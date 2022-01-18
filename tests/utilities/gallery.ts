import { test } from 'uvu';
import * as assert from 'uvu/assert';
import {
  address1,
  openingHours1,
  openingHours2,
  openingHours3,
  openingHours4,
} from '../../fixtures/utilities/gallery';
import {
  addressStringFromPostalAddress,
  openingTimesFromOpeningHours,
  validName,
  validOpeningHours,
} from '../../src/utilities/gallery';

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

test('validOpeningHours', () => {
  assert.type(validOpeningHours, 'function');
  assert.is(validOpeningHours({ openingHoursRanges: openingHours1 }).length, 0);
  assert.is(validOpeningHours({ openingHoursRanges: openingHours2 }).length, 3);
  assert.is(validOpeningHours({ openingHoursRanges: openingHours3 }).length, 2);
  assert.is(validOpeningHours({ openingHoursRanges: openingHours4 }).length, 4);

  const { field, message } = validOpeningHours({ openingHoursRanges: openingHours2 })[0];
  assert.is(field, 'openingTime0');
  assert.is(message, 'Check time is in 18:30 format');

  const { field: field1, message: message1 } = validOpeningHours({
    openingHoursRanges: openingHours2,
  })[1];
  assert.is(field1, 'openingTime1');
  assert.is(message1, 'Check time is in 18:30 format');

  const { field: field2, message: message2 } = validOpeningHours({
    openingHoursRanges: openingHours2,
  })[2];
  assert.is(field2, 'closingTime1');
  assert.is(message2, 'Check time is in 18:30 format');

  const { field: field3, message: message3 } = validOpeningHours({
    openingHoursRanges: openingHours3,
  })[0];
  assert.is(field3, 'openingTime0');
  assert.is(message3, 'Check opening time is earlier than closing time');

  const { field: field4, message: message4 } = validOpeningHours({
    openingHoursRanges: openingHours3,
  })[1];
  assert.is(field4, 'closingTime0');
  assert.is(message4, 'Check opening time is earlier than closing time');
});

test.run();
