import type {
  GQLPublishArticleInput,
  GQLPutDraftInput,
  GQLSetFeatureInput,
  GQLUserRegisterInput,
  User,
} from 'definitions'

import { ApolloServer, GraphQLRequest, GraphQLResponse } from '@apollo/server'

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
  CollectionService,
} from 'connectors'
import {
  PublicationQueue,
  RevisionQueue,
  AssetQueue,
  AppreciationQueue,
  IPFSQueue,
  MigrationQueue,
  PayToByBlockchainQueue,
  PayToByMattersQueue,
  PayoutQueue,
  UserQueue,
} from 'connectors/queue'

import { genConnections } from '../../connectors/__test__/utils'
import schema from '../../schema'

export { genConnections }

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
  const userService = new UserService(await genConnections())
  const user = await userService.findByEmail(email)
  if (user === undefined) {
    return { viewer: {} as any as User }
  }
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
    isFrozen,
    isBanned,
    noUserName,
    context,
    dataSources,
  }: {
    isAuth?: boolean
    isAdmin?: boolean
    isMatty?: boolean
    isFrozen?: boolean
    isBanned?: boolean
    context?: any
    noUserName?: boolean
    dataSources?: any
  } = {
    isAuth: false,
    isAdmin: false,
    isMatty: false,
    isBanned: false,
    isFrozen: false,
    noUserName: false,
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
        : isFrozen
        ? 'frozen@matters.news'
        : isBanned
        ? 'banned@matters.town'
        : isAdmin
        ? adminUser.email
        : noUserName
        ? 'nousername@matters.town'
        : defaultTestUser.email,
    })
  }

  const viewer = (_context && _context.viewer) || {}

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
  const connections = await genConnections()
  const queueRedis = connections.redis

  const publicationQueue = new PublicationQueue(queueRedis, connections)
  const revisionQueue = new RevisionQueue(queueRedis, connections)
  const assetQueue = new AssetQueue(queueRedis, connections)
  const appreciationQueue = new AppreciationQueue(queueRedis, connections)
  const migrationQueue = new MigrationQueue(queueRedis, connections)
  const payToByBlockchainQueue = new PayToByBlockchainQueue(
    queueRedis,
    connections
  )
  const payToByMattersQueue = new PayToByMattersQueue(queueRedis, connections)
  const payoutQueue = new PayoutQueue(queueRedis, connections)
  const userQueue = new UserQueue(queueRedis, connections)
  const ipfsQueue = new IPFSQueue(queueRedis, connections)
  const queues = {
    publicationQueue,
    revisionQueue,
    assetQueue,
    appreciationQueue,
    migrationQueue,
    payToByBlockchainQueue,
    payToByMattersQueue,
    payoutQueue,
    userQueue,
    ipfsQueue,
  }

  const genContext = () => ({
    ..._context,
    connections,
    queues,
    dataSources: {
      atomService: new AtomService(connections),
      userService: new UserService(connections),
      articleService: new ArticleService(connections),
      commentService: new CommentService(connections),
      draftService: new DraftService(connections),
      systemService: new SystemService(connections),
      tagService: new TagService(connections),
      notificationService: new NotificationService(connections),
      oauthService: new OAuthService(connections),
      paymentService: new PaymentService(connections),
      collectionService: new CollectionService(connections),
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
