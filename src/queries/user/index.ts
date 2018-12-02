import { Context } from 'src/definitions'

import articles from './articles'
import followers from './followers'
import follows from './follows'
import MAT from './MAT'
import articleCount from './articleCount'
import commentCount from './commentCount'
import followCount from './followCount'
import followerCount from './followerCount'
import notices from './notices'

export default {
  Query: {
    user: (root: any, { id }: { id: string }, { userService }: Context) =>
      userService.loader.load(id)
  },

  User: {
    settings: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.findSettingByUserId(id),
    // status, // short hand for delegating resolver to UserStatusType
    // drafts
    // courses
    articles,
    followers,
    follows,
    notices,
    info: (root: any) => root
  },
  Notice: {
    __resolveType(): string {
      return 'UserNotice'
    }
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
