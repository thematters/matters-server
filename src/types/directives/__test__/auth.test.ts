import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql } from 'graphql'

import { AUTH_MODE } from '#common/enums/index.js'

import { authDirective } from '../auth.js'

const { typeDef, transformer } = authDirective('auth')

const makeSchema = () =>
  transformer(
    makeExecutableSchema({
      typeDefs: [
        typeDef,
        `type OSS { secret: String }
         type Query {
           oss: OSS @auth(mode: "${AUTH_MODE.admin}")
           publicField: String @auth(mode: "${AUTH_MODE.visitor}")
         }`,
      ],
      resolvers: {
        Query: { oss: () => ({}), publicField: () => 'public' },
        OSS: { secret: () => 'TOP-SECRET' },
      },
    })
  )

// anonymous visitor: no `id`, only the visitor auth mode
const anonymousViewer = {
  authMode: AUTH_MODE.visitor,
  hasAuthMode: (req: string) => req === AUTH_MODE.visitor,
}

const run = (source: string) =>
  graphql({
    schema: makeSchema(),
    source,
    contextValue: { viewer: anonymousViewer },
  })

describe('auth directive — anonymous access to admin-gated fields', () => {
  test('rejects an anonymous query of an admin field (oss)', async () => {
    const res = await run('{ oss { secret } }')
    expect(res.data?.oss ?? null).toBeNull()
    expect(res.errors?.[0]?.message).toMatch(/isn't authorized/)
  })

  // Regression for the field-alias bypass: aliasing `oss` must NOT skip the admin gate.
  test('rejects an anonymous query of an ALIASED admin field', async () => {
    const res = await run('{ x: oss { secret } }')
    expect(
      (res.data as { x?: unknown } | null | undefined)?.x ?? null
    ).toBeNull()
    expect(res.errors?.[0]?.message).toMatch(/isn't authorized/)
  })

  test('still allows an anonymous query of a visitor field', async () => {
    const res = await run('{ publicField }')
    expect(res.errors).toBeUndefined()
    expect(res.data?.publicField).toBe('public')
  })
})
