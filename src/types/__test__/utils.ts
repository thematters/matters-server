import { ApolloServer, GraphQLRequest, GraphQLResponse } from '@apollo/server'

import { authModes, roleAccess } from 'common/utils'
import {
  ArticleService,
  AtomService,
  CommentService,
  DraftService,
  knex,
  NotificationService,
  OAuthService,
  PaymentService,
  SystemService,
  TagService,
  UserService,
  CollectionService,
} from 'connectors'
import {
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
    isBanned,
    context,
    dataSources,
  }: {
    isAuth?: boolean
    isAdmin?: boolean
    isMatty?: boolean
    isOnboarding?: boolean
    isFrozen?: boolean
    isBanned?: boolean
    context?: any
    dataSources?: any
  } = {
    isAuth: false,
    isAdmin: false,
    isMatty: false,
    isBanned: false,
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
        : isBanned
        ? 'banned@matters.town'
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
  })

  const genContext = () => ({
    ..._context,
    knex,
    dataSources: {
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
      collectionService: new CollectionService(),
      ...dataSources,
    },
  })

  await server.start()

  // mock v3 apollo server behavior
  return {
    executeOperation: async (req: GraphQLRequest) =>
      v4ToV3Result(
        await server.executeOperation(req, { contextValue: genContext() })
      ),
  }
}

const v4ToV3Result = (res: GraphQLResponse): any => {
  const { body } = res
  if (body.kind === 'single') {
    return body.singleResult as any
  } else {
    return body.initialResult as any
  }
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
        iscnPublish
        article { id iscnId content }
      }
    }
  `

  const server = await testClient({
    isAuth: true,
  })

  const { data } = await server.executeOperation({
    query: PUBLISH_ARTICLE,
    variables: { input },
  })

  const draft = data && data.publishArticle
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
          totalCount
          edges {
            node {
              id
            }
          }
        }
        tags
        cover
        title
        summary
        summaryCustomized
        content
        createdAt
        sensitiveByAuthor
        license
        requestForDonation
        replyToDonator
        iscnPublish
        canComment
      }
    }
  `

  const server = await testClient({
    isAuth: true,
    ...client,
  })
  const result = await server.executeOperation({
    query: PUT_DRAFT,
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

  const server = await testClient()
  return server.executeOperation({
    query: USER_REGISTER,
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
  const server = await testClient({
    context,
  })
  return server.executeOperation({
    query: UPDATE_USER_INFO_DESCRIPTION,
    variables: { input: { description } },
  })
}

export const updateUserState = async ({
  id,
  emails,
  state,
  password,
}: {
  id?: string
  emails?: string[]
  state: string
  password?: string
}) => {
  const UPDATE_USER_STATE = `
    mutation UpdateUserState($input: UpdateUserStateInput!) {
      updateUserState(input: $input) {
        id
        status {
          state
        }
        info {
          email
        }
      }
    }
  `

  const server = await testClient({ isAdmin: true, isAuth: true })
  return server.executeOperation({
    query: UPDATE_USER_STATE,
    variables: { input: { id, state, emails, password } },
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
  const server = await testClient({ isAdmin, isAuth, isMatty })
  const result = await server.executeOperation({
    query: SET_FEATURE_FLAG,
    variables: { input },
  })
  const data = result?.data?.setFeature
  return data
}
