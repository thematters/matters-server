import { toGlobalId } from 'common/utils'
import {
  GQLCircleSettingTypeResolver,
  GQLCircleTypeResolver,
  GQLMemberTypeResolver,
  GQLPriceTypeResolver,
  GQLQueryTypeResolver,
} from 'definitions'

import avatar from './avatar'
import cover from './cover'
import followers from './followers'
import isFollower from './isFollower'
import isMember from './isMember'
import memberIsInvited from './member/isInvited'
import memberPrice from './member/price'
import memberUser from './member/User'
import members from './members'
import owner from './owner'
import priceCircle from './price/circle'
import prices from './prices'
import rootCircle from './rootCircle'
import enableBroadcast from './setting/enableBroadcast'
import enableDiscussion from './setting/enableDiscussion'
import works from './works'

const circle: {
  Query: GQLQueryTypeResolver

  Circle: GQLCircleTypeResolver
  CircleSetting: GQLCircleSettingTypeResolver
  Member: GQLMemberTypeResolver
  Price: GQLPriceTypeResolver
} = {
  Query: {
    circle: rootCircle,
  },

  Circle: {
    id: ({ id }) => (id ? toGlobalId({ type: 'Circle', id }) : ''),
    avatar,
    cover,
    prices,
    owner,
    members,
    followers,
    works,
    isFollower,
    isMember,
    setting: (root: any) => root,
  },

  CircleSetting: {
    enableBroadcast,
    enableDiscussion,
  },

  Member: {
    user: memberUser,
    price: memberPrice,
    isInvited: memberIsInvited,
  },

  Price: {
    id: ({ id }) => (id ? toGlobalId({ type: 'Price', id }) : ''),
    circle: priceCircle,
  },
}

export default circle
