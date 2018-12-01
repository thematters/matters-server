import user from './rootUser'
import articles from './articles'
import comments from './comments'
import followers from './followers'
import follows from './follows'
import thirdPartyAccounts from './articles'
import MAT from './MAT'
import articleCount from './articleCount'
import commentCount from './commentCount'
import followCount from './followCount'
import followerCount from './followerCount'
import notices from './notices'

export default {
  Query: {
    user
  },

  User: {
    // settings,
    // status, // short hand for delegating resolver to UserStatusType
    // drafts
    // courses
    articles,
    comments,
    // subscriptions
    // history
    // dialogues
    // hasFollowed
    followers,
    follows,
    notices
  },
  Notice: {
    __resolveType(): string {
      return 'UserNotice'
    }
  },
  UserSettings: {
    // language,
    thirdPartyAccounts
  },
  UserStatus: {
    MAT,
    articleCount,
    commentCount,
    followCount,
    followerCount
    // draftCount: Number // 草稿數
    // courseCount: Number // 已購買課程數
    // subscriptionCount: Number // 總訂閱數
  }
}
