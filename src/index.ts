require('module-alias/register')
// external
import { ApolloServer } from 'apollo-server'
// import jwt from 'jsonwebtoken'
// internal

import { makeContext } from 'common/util'
// local
import schema from './schema'

const mocks = {
  JSON: () => ({
    'index.html': '<html><p>hello</p></html>',
    '1.png': 'some png string'
  }),
  DateTime: () => new Date().toISOString(),
  Email: () => 'test@matters.news',
  UUID: () => '00000000-0000-0000-0000-000000000001',
  URL: () => 'test-url'
}

const server = new ApolloServer({
  schema,
  context: makeContext,
  engine: {
    apiKey: process.env['ENGINE_API_KEY']
  }
  // mocks
})

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
