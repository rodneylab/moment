import type { FastifyInstance } from 'fastify';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import build from '../../src/app';

let app: FastifyInstance;

test.before(async () => {
  app = await build();
});

test.before.each((meta) => {
  console.log(meta['__test__']);
});

test.after(async () => {
  if (typeof app != 'undefined') {
    await app.close();
  }
});

test('it sends expected response to hello query', async () => {
  try {
    const query = `
    query Query {
      hello
    }
  `;

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'content-type': 'application/json' },
      payload: { query, variables: {} },
    });

    const json = await response.json();
    assert.snapshot(JSON.stringify(json), '{"data":{"hello":"Hello everybody!"}}');
    assert.is(json.data.hello, 'Hello everybody!');
  } catch (error) {
    console.error(
      `Error in test resolvers/hello.ts: it sends expected response to hello query: ${error}`,
    );
  }
});

test.run();
