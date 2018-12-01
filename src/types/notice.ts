export default /* GraphQL */ `
  extend type Subscription {
    notice: Notice
  }

  extend type User {
    notices: [Notice]
  }

  union Notice = CommentNotice | ArticleNotice | UserNotice

  type UserNotice {
    label: UserNoticeLabel
    hasRead: Boolean
    user: [User]!
  }

  enum UserNoticeLabel {
    follow
    appreciate
    subscribe
  }

  type ArticleNotice {
    label: ArticleNoticeLabel
    hasRead: Boolean
    article: Article  
  }

  enum ArticleNoticeLabel {
    downstream
    published
    newChapter
  }

  type CommentNotice {
    label: CommentNoticeLabel
    hasRead: Boolean
    comment: Comment
  }

  enum CommentNoticeLabel {
    reply
    newOnArticle
    newOnSubscribed
    pin
    vote
    mention
  }
`
