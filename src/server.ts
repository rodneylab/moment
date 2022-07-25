import app from './app';

(async () => {
  const server = await app();

  server.listen({ port: 4000 }, () => {
    console.log(`Server ready at
http://localhost:4000/graphql`);
  });
})();
