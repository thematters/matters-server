require('module-alias/register')
// external
import { ApolloServer } from 'apollo-server'
import jwt from 'jsonwebtoken'
// internal
import { makeContext } from 'common/utils'
import { environment } from 'common/environment'
// local
import schema from './schema'
import { UserService } from './connectors'

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

const userService = new UserService()
const server = new ApolloServer({
  schema,
  context: makeContext,
  engine: {
    apiKey: process.env['ENGINE_API_KEY']
  },
  subscriptions: {
    onConnect: async ({ accessToken }: { accessToken?: string }, webSocket) => {
      if (!accessToken) {
        throw new Error('Missing accessToken!')
      }

      try {
        const decoded = jwt.verify(accessToken, environment.jwtSecret) as {
          uuid: string
        }
        return {
          viewer: await userService.baseFindByUUID(decoded.uuid)
        }
      } catch (err) {
        console.log('User is not logged in, viewing as guest')
      }
    }
  }
  // mocks
})

server
  .listen({ port: process.env.PORT || 4000 })
  .then(({ url, subscriptionsUrl }) => {
    console.log(`🚀 Server ready at ${url}`)
    console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`)
  })
