import { Context } from 'src/definitions'

import followers from './followers'
import follows from './follows'
import articleCount from './articleCount'
import commentCount from './commentCount'
import followCount from './followCount'
import followerCount from './followerCount'
import notices from './notices'
import settings from './settings'

export default {
  Query: {
    user: (root: any, { id }: { id: string }, { userService }: Context) =>
      userService.uuidLoader.load(id)
  },
  User: {
    settings,
    // drafts
    // courses
    followers,
    follows,
    notices,
    info: (root: any) => root,
    status: (root: any) => root
  },
  Notice: {
    __resolveType(): string {
      return 'UserNotice'
    }
  },
  UserStatus: {
    articleCount,
    commentCount,
    followCount,
    followerCount
    // draftCount: Number // 草稿數
    // courseCount: Number // 已購買課程數
    // subscriptionCount: Number // 總訂閱數
  }
}
