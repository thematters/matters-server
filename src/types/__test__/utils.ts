import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'
import { Request } from 'express'

import { roleAccess, scopeModes } from 'common/utils'
import {
  ArticleService,
  CommentService,
  DraftService,
  NotificationService,
  OAuthService,
  SystemService,
  TagService,
  UserService
} from 'connectors'
import {
  DataSources,
  GQLPublishArticleInput,
  GQLPutDraftInput,
  GQLUserRegisterInput
} from 'definitions'

import schema from '../../schema'

export const defaultTestUser = {
  email: 'test1@matters.news',
  password: '123'
}
export const adminUser = {
  email: 'admin1@matters.news',
  password: '123'
}

export const getUserContext = async ({ email }: { email: string }) => {
  const userService = new UserService()
  const user = await userService.findByEmail(email)
  return {
    viewer: user
  }
}

export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const testClient = async (
  {
    isAuth,
    isAdmin,
    isMatty,
    isOnboarding,
    context
  }: {
    isAuth?: boolean
    isAdmin?: boolean
    isMatty?: boolean
    isOnboarding?: boolean
    context?: any
  } = {
    isAuth: false,
    isAdmin: false,
    isMatty: false,
    isOnboarding: false,
    context: null
  }
) => {
  let _context: any = {}
  if (context) {
    _context = context
  } else if (isAuth) {
    _context = await getUserContext({
      email: isMatty
        ? 'hi@matters.news'
        : isOnboarding
        ? 'onboarding@matters.news'
        : isAdmin
        ? adminUser.email
        : defaultTestUser.email
    })
  }

  const viewer = (_context && _context.viewer) || { id: null }

  if (!viewer.role) {
    viewer.role = isAdmin ? 'admin' : isAuth ? 'user' : 'visitor'
  }

  if (!viewer.scopeMode) {
    viewer.scopeMode = viewer.role
  }
  if (!viewer.scope) {
    viewer.scope = {}
  }

  _context.viewer = {
    ...viewer,
    hasRole: (requires: string) =>
      roleAccess.findIndex(role => role === viewer.role) >=
      roleAccess.findIndex(role => role === requires),
    hasScopeMode: (requires: string) =>
      scopeModes.findIndex(mode => mode === viewer.scopeMode) >=
      scopeModes.findIndex(mode => mode === requires)
  }

  if (isOnboarding) {
    console.log('isOnboarding', _context.viewer)
  }

  const server = new ApolloServer({
    schema,
    context: ({ req }: { req: Request }) => {
      return { req, ..._context }
    },
    dataSources: (): DataSources => ({
      userService: new UserService(),
      articleService: new ArticleService(),
      commentService: new CommentService(),
      draftService: new DraftService(),
      systemService: new SystemService(),
      tagService: new TagService(),
      notificationService: new NotificationService(),
      oauthService: new OAuthService()
    })
  })

  return createTestClient(server)
}

export const publishArticle = async (input: GQLPublishArticleInput) => {
  const PUBLISH_ARTICLE = `
    mutation($input: PublishArticleInput!) {
      publishArticle(input: $input) {
        id
        publishState
        title
        content
        createdAt
      }
    }
  `

  const { mutate } = await testClient({
    isAuth: true
  })

  const result = await mutate({
    mutation: PUBLISH_ARTICLE,
    // @ts-ignore
    variables: { input }
  })

  const draft = result && result.data && result.data.publishArticle
  return draft
}

export const putDraft = async (draft: GQLPutDraftInput) => {
  const PUT_DRAFT = `
    mutation($input: PutDraftInput!) {
      putDraft(input: $input) {
        id
        collection(input: { first: 10 }) {
          edges {
            node {
              id
            }
          }
        }
        cover
        title
        summary
        content
        createdAt
      }
    }
  `
  const { mutate } = await testClient({
    isAuth: true
  })
  const result = await mutate({
    mutation: PUT_DRAFT,
    // @ts-ignore
    variables: { input: draft }
  })

  const putDraftResult = result && result.data && result.data.putDraft
  return putDraftResult
}

export const registerUser = async (user: GQLUserRegisterInput) => {
  const USER_REGISTER = `
    mutation UserRegister($input: UserRegisterInput!) {
      userRegister(input: $input) {
        auth
        token
      }
    }
  `

  const { mutate } = await testClient()
  return mutate({
    mutation: USER_REGISTER,
    // @ts-ignore
    variables: { input: user }
  })
}

export const updateUserDescription = async ({
  email,
  description
}: {
  email?: string
  description: string
}) => {
  const UPDATE_USER_INFO_DESCRIPTION = `
    mutation UpdateUserInfo($input: UpdateUserInfoInput!) {
      updateUserInfo(input: $input) {
        info {
          description
        }
      }
    }
  `

  let _email = defaultTestUser.email
  if (email) {
    _email = email
  }
  const context = await getUserContext({ email: _email })
  const { mutate } = await testClient({
    context
  })
  return mutate({
    mutation: UPDATE_USER_INFO_DESCRIPTION,
    // @ts-ignore
    variables: { input: { description } }
  })
}
