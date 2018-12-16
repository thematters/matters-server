export default /* GraphQL */ `
  extend type User {
    notices(input: NoticesInput): [Notice]
  }

  extend type Subscription {
    notice: Notice
  }

  input NoticesInput {
    offset: Int
    limit: Int
    unread: Boolean
  }

  type Notice {
    uuid: UUID!
    unread: Boolean!
    createdAt: DateTime!
    type: NoticeType!
    actors: [User]
    entity: NoticeEntity
    message: String
    data: JSON
  }

  enum NoticeType {
    user_new_follower

    article_published
    article_new_downstream
    article_new_appreciation
    article_new_subscriber
    article_new_chapter
    article_new_comment
    subscribed_article_new_comment

    comment_pinned
    comment_new_reply
    comment_new_upvote
    comment_mentioned_you

    official_announcement
  }

  union NoticeEntity = User | Article | Comment
`
