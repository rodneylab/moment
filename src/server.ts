import app from './app';

void (async () => {
  const server = await app();

  server.listen({ port: 4000 }, (error) => {
    if (error) throw error;
    console.log(`Server ready at
http://localhost:4000/graphiql`);
  });
})();
