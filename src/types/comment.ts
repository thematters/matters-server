import {
  AUTH_MODE,
  CACHE_TTL,
  NODE_TYPES,
  SCOPE_GROUP,
} from '#common/enums/index.js'
import { isProd } from '#common/environment.js'

const PUT_COMMENT_RATE_LIMIT = isProd ? 6 : 1000

export default /* GraphQL */ `
  extend type Query {
    "Recent public Community Watch audit records."
    communityWatchActions(input: CommunityWatchActionsInput!): CommunityWatchActionConnection! @complexity(multipliers: ["input.first"], value: 1) @cacheControl(maxAge: ${CACHE_TTL.SHORT})

    "One public Community Watch audit record."
    communityWatchAction(input: CommunityWatchActionInput!): CommunityWatchAction @cacheControl(maxAge: ${CACHE_TTL.SHORT})
  }

  extend type Mutation {
    "Publish or update a comment."
    putComment(input: PutCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.Comment}") @rateLimit(limit: ${PUT_COMMENT_RATE_LIMIT}, period: 60)

    "Remove a comment."
    deleteComment(input: DeleteCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.Comment}")

    "Pin or Unpin a comment."
    togglePinComment(input: ToggleItemInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Comment}")

    "Upvote or downvote a comment."
    voteComment(input: VoteCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Comment}")

    "Unvote a comment."
    unvoteComment(input: UnvoteCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Comment}")

    "Update a comments' state."
    updateCommentsState(input: UpdateCommentsStateInput!): [Comment!]! @complexity(value: 10, multipliers: ["input.ids"]) @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.Comment}")

    "Remove a spam comment as a Community Watch member."
    communityWatchRemoveComment(input: CommunityWatchRemoveCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.Comment}")


    ##############
    # DEPRECATED #
    ##############
    "Pin a comment."
    pinComment(input: PinCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Comment}")

    "Unpin a comment."
    unpinComment(input: UnpinCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Comment}")
  }

  """
  This type contains content, author, descendant comments and related data of a comment.
  """
  type Comment implements Node {
    "Unique ID of this comment."
    id: ID!

    "State of this comment."
    state: CommentState!

    type: CommentType!

    "Time of this comment was created."
    createdAt: DateTime!

    "Content of this comment."
    content: String

    "Community Watch audit action when this comment was removed by Community Watch."
    communityWatchAction: CommunityWatchAction

    "Author of this comment."
    author: User! @logCache(type: "${NODE_TYPES.User}")

    "This value determines this comment is pinned or not."
    pinned: Boolean!

    "This value determines this comment is from article donator or not."
    fromDonator: Boolean!

    "The counting number of upvotes."
    upvotes: Int!

    "The counting number of downvotes."
    downvotes: Int! @deprecated(reason: "No longer in use in querying")

    "The value determines current user's vote."
    myVote: Vote

    "Descendant comments of this comment."
    comments(input: CommentCommentsInput!): CommentConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Parent comment of this comment."
    parentComment: Comment @logCache(type: "${NODE_TYPES.Comment}")

    "A Comment that this comment replied to."
    replyTo: Comment @logCache(type: "${NODE_TYPES.Comment}")

    spamStatus: SpamStatus! @auth(mode: "${AUTH_MODE.admin}")
    remark: String @auth(mode: "${AUTH_MODE.admin}")

    "Current comment belongs to which Node."
    node: Node! @logCache(type: "${NODE_TYPES.Node}")
  }

  extend type Article {
    "The counting number of comments."
    commentCount: Int!

    "The number determines how many pinned comments can be set."
    pinCommentLimit: Int!

    "The number determines how many comments can be set as pinned comment."
    pinCommentLeft: Int!

    "List of pinned comments."
    pinnedComments: [Comment!] @logCache(type: "${NODE_TYPES.Comment}")

    "List of featured comments of this article."
    featuredComments(input: FeaturedCommentsInput!): CommentConnection! @complexity(multipliers: ["input.first"], value: 1)

    "List of comments of this article."
    comments(input: CommentsInput!): CommentConnection! @complexity(multipliers: ["input.first"], value: 1)
  }

  extend type Circle {
    "Comments broadcasted by Circle owner."
    broadcast(input: CommentsInput!): CommentConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Pinned comments broadcasted by Circle owner."
    pinnedBroadcast: [Comment!] @logCache(type: "${NODE_TYPES.Comment}")

    "Comments made by Circle member."
    discussion(input: CommentsInput!): CommentConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Discussion (exclude replies) count of this circle."
    discussionThreadCount: Int!

    "Discussion (include replies) count of this circle."
    discussionCount: Int!
  }

  type CommentConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CommentEdge!]
  }

  type CommentEdge {
    cursor: String!
    node: Comment! @logCache(type: "${NODE_TYPES.Comment}")
  }

  input PutCommentInput {
    comment: CommentInput!

    # edit comment if id is provided
    id: ID
  }

  input CommentInput {
    content: String!
    replyTo: ID
    parentId: ID
    mentions: [ID!]
    type: CommentType!

    # one of the following ids is required
    articleId: ID
    circleId: ID
    momentId: ID
  }

  input CommentCommentsInput {
    author: ID
    sort: CommentSort
    after: String
    first: Int @constraint(min: 0)
  }

  input CommentsInput {
    sort: CommentSort
    after: String
    before: String
    includeAfter: Boolean
    includeBefore: Boolean
    first: Int @constraint(min: 0)
    filter: CommentsFilter
  }

  input FeaturedCommentsInput {
    sort: CommentSort
    after: String
    first: Int @constraint(min: 0)
  }

  input CommentsFilter {
    parentComment: ID
    state: CommentState
    author: ID
  }

  "Enums for sorting comments by time."
  enum CommentSort {
    oldest
    newest
  }

  input PinCommentInput {
    id: ID!
  }

  input UnpinCommentInput {
    id: ID!
  }

  input DeleteCommentInput {
    id: ID!
  }

  input VoteCommentInput {
    vote: Vote!
    id: ID!
  }

  input UnvoteCommentInput {
    id: ID!
  }

  input UpdateCommentsStateInput {
    ids: [ID!]!
    state: CommentState!
  }

  input CommunityWatchRemoveCommentInput {
    id: ID!
    reason: CommunityWatchRemoveCommentReason!
  }

  input CommunityWatchActionsInput {
    after: String
    first: Int @constraint(min: 0)
    reason: CommunityWatchRemoveCommentReason
    actionState: CommunityWatchActionState
    appealState: CommunityWatchAppealState
    reviewState: CommunityWatchReviewState
  }

  input CommunityWatchActionInput {
    uuid: ID!
  }

  enum CommunityWatchRemoveCommentReason {
    porn_ad
    spam_ad
  }

  enum CommunityWatchActionSourceType {
    article
    moment
  }

  enum CommunityWatchActionState {
    active
    restored
    voided
  }

  enum CommunityWatchAppealState {
    none
    received
    resolved
  }

  enum CommunityWatchReviewState {
    pending
    upheld
    reversed
    reason_adjusted
  }

  type CommunityWatchAction {
    "Public identifier used by the Community Watch transparency page."
    uuid: ID!
    commentId: ID!
    sourceType: CommunityWatchActionSourceType!
    sourceTitle: String!
    sourceId: ID!
    actorDisplayName: String!
    reason: CommunityWatchRemoveCommentReason!
    actionState: CommunityWatchActionState!
    appealState: CommunityWatchAppealState!
    reviewState: CommunityWatchReviewState!
    originalContent: String
    contentCleared: Boolean!
    createdAt: DateTime!
  }

  type CommunityWatchActionConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CommunityWatchActionEdge!]
  }

  type CommunityWatchActionEdge {
    cursor: String!
    node: CommunityWatchAction!
  }

  "Enums for vote types."
  enum Vote {
    up
    down
  }

  "Enums for comment state."
  enum CommentState {
    active
    archived
    banned
    collapsed
  }

  enum CommentType {
    article
    circleDiscussion
    circleBroadcast
    moment
  }
`
