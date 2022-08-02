import app from './app';

void (async () => {
  const server = await app();

  server.listen(4000, () => {
    console.log(`Server ready at
http://localhost:4000/graphiql`);
  });
})();
