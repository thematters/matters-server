export default /* GraphQL */ `
  extend type User {
    notices(input: NoticesInput): [Notice]!
  }

  input NodeEditedInput {
    id: ID!
  }

  input NoticesInput {
    offset: Int
    limit: Int
    hasRead: Boolean
  }

  interface Notice {
    hasRead: Boolean
    createdAt: DateTime
    users: [User]
  }

  type UserNotice implements Notice {
    hasRead: Boolean
    createdAt: DateTime
    users: [User]
    action: UserNoticeAction
    target: User
  }

  enum UserNoticeAction {
    follow
    appreciate
    subscribe
  }

  type ArticleNotice implements Notice {
    hasRead: Boolean
    createdAt: DateTime
    users: [User]  
    action: ArticleNoticeAction
    target: Article  
  }

  enum ArticleNoticeAction {
    downstream
    published
    newChapter
  }

  type CommentNotice implements Notice {
    hasRead: Boolean 
    createdAt: DateTime
    users: [User]
    action: CommentNoticeAction
    target: Comment
  }

  enum CommentNoticeAction {
    reply
    newOnArticle
    newOnSubscribed
    pin
    vote
    mention
  }
`
