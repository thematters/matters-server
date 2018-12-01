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
    // settings
    followers,
    follows
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
