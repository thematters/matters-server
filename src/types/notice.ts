export default /* GraphQL */ `
  extend type User {
    notices(input: ListInput!): [Notice]
  }

  type Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    type: NoticeType!
    actors: [User]
    entities: [NoticeEntity]
    message: String
    data: JSON
  }

  type NoticeEntity {
    type: String
    node: Node
  }

  enum NoticeType {
    user_new_follower
    user_disabled

    article_published
    article_reported
    article_archived_violation
    article_new_downstream
    article_new_appreciation
    article_new_subscriber
    article_new_comment
    subscribed_article_new_comment

    comment_pinned
    comment_reported
    comment_archived_violation
    comment_new_reply
    comment_new_upvote
    comment_mentioned_you

    official_announcement
  }
`
