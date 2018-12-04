export default /* GraphQL */ `
  extend type Subscription {
    notice: Notice
  }

  extend type User {
    notices: [Notice]
  }

  interface Notice {
    hasRead: Boolean
    createdAt: DateTime
    user: User
  }

  type UserNotice implements Notice {
    hasRead: Boolean
    createdAt: DateTime
    user: User
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
    user: User  
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
    user: User
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
