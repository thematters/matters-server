import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'
import { Request } from 'express'

import { authModes, roleAccess } from 'common/utils'
import {
  ArticleService,
  AtomService,
  CommentService,
  DraftService,
  NotificationService,
  OAuthService,
  PaymentService,
  SystemService,
  TagService,
  UserService,
} from 'connectors'
import {
  DataSources,
  GQLPublishArticleInput,
  GQLPutDraftInput,
  GQLSetFeatureInput,
  GQLUserRegisterInput,
} from 'definitions'

import schema from '../../schema'

interface BaseInput {
  isAdmin?: boolean
  isAuth?: boolean
  isMatty?: boolean
}

export const defaultTestUser = {
  email: 'test1@matters.news',
  password: '123',
}
export const adminUser = {
  email: 'admin1@matters.news',
  password: '123',
}

export const getUserContext = async ({ email }: { email: string }) => {
  const userService = new UserService()
  const user = await userService.findByEmail(email)
  return {
    viewer: user,
  }
}

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const testClient = async (
  {
    isAuth,
    isAdmin,
    isMatty,
    isOnboarding,
    isFrozen,
    context,
  }: {
    isAuth?: boolean
    isAdmin?: boolean
    isMatty?: boolean
    isOnboarding?: boolean
    isFrozen?: boolean
    context?: any
  } = {
    isAuth: false,
    isAdmin: false,
    isMatty: false,
    isOnboarding: false,
    isFrozen: false,
    context: null,
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
        : isFrozen
        ? 'frozen@matters.news'
        : isAdmin
        ? adminUser.email
        : defaultTestUser.email,
    })
  }

  const viewer = (_context && _context.viewer) || { id: null }

  if (!viewer.role) {
    viewer.role = isAdmin ? 'admin' : isAuth ? 'user' : 'visitor'
  }

  if (!viewer.authMode) {
    viewer.authMode = viewer.role
  }

  if (!viewer.scope) {
    viewer.scope = {}
  }

  _context.viewer = {
    ...viewer,
    hasRole: (requires: string) =>
      roleAccess.findIndex((role) => role === viewer.role) >=
      roleAccess.findIndex((role) => role === requires),
    hasAuthMode: (requires: string) =>
      authModes.findIndex((mode) => mode === viewer.authMode) >=
      authModes.findIndex((mode) => mode === requires),
  }

  const server = new ApolloServer({
    schema,
    context: ({ req }: { req: Request }) => {
      return { req, ..._context }
    },
    dataSources: (): DataSources => ({
      atomService: new AtomService(),
      userService: new UserService(),
      articleService: new ArticleService(),
      commentService: new CommentService(),
      draftService: new DraftService(),
      systemService: new SystemService(),
      tagService: new TagService(),
      notificationService: new NotificationService(),
      oauthService: new OAuthService(),
      paymentService: new PaymentService(),
    }),
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
    isAuth: true,
  })

  const result = await mutate({
    mutation: PUBLISH_ARTICLE,
    // @ts-ignore
    variables: { input },
  })

  const draft = result && result.data && result.data.publishArticle
  return draft
}

interface PutDraftInput {
  client?: {
    isFrozen?: boolean
  }
  draft: GQLPutDraftInput
}

export const putDraft = async ({ draft, client }: PutDraftInput) => {
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
    isAuth: true,
    ...client,
  })
  const result = await mutate({
    mutation: PUT_DRAFT,
    // @ts-ignore
    variables: { input: draft },
  })

  if (!result.data) {
    // if no return data, then pass entire result to parent
    return result
  }

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
    variables: { input: user },
  })
}

export const updateUserDescription = async ({
  email,
  description,
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
    context,
  })
  return mutate({
    mutation: UPDATE_USER_INFO_DESCRIPTION,
    // @ts-ignore
    variables: { input: { description } },
  })
}

export const updateUserState = async ({
  id,
  state,
}: {
  id: string
  state: string
}) => {
  const UPDATE_USER_STATE = `
    mutation UpdateUserState($input: UpdateUserStateInput!) {
      updateUserState(input: $input) {
        id
        status {
          state
        }
      }
    }
  `

  const { mutate } = await testClient({ isAdmin: true })
  return mutate({
    mutation: UPDATE_USER_STATE,
    variables: { input: { id, state } },
  })
}

export const setFeature = async ({
  isAdmin = true,
  isAuth = true,
  isMatty = true,
  input,
}: { input: GQLSetFeatureInput } & BaseInput) => {
  const SET_FEATURE_FLAG = `
    mutation ($input: SetFeatureInput!) {
      setFeature(input: $input) {
        name
        enabled
      }
    }
  `
  const { mutate } = await testClient({ isAdmin, isAuth, isMatty })
  const result = await mutate({
    mutation: SET_FEATURE_FLAG,
    // @ts-ignore
    variables: { input },
  })
  const data = result?.data?.setFeature
  return data
}
