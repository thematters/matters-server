import { toGlobalId } from 'common/utils'
import {
  GQLCircleSettingTypeResolver,
  GQLCircleTypeResolver,
  GQLInvitationTypeResolver,
  GQLInviteeTypeResolver,
  GQLMemberTypeResolver,
  GQLPersonTypeResolver,
  GQLPossibleInviteeTypeNames,
  GQLPriceTypeResolver,
  GQLQueryTypeResolver,
} from 'definitions'

import avatar from './avatar'
import cover from './cover'
import followers from './followers'
import invitationCircle from './invitation/circle'
import freePeriod from './invitation/freePeriod'
import invitee from './invitation/invitee'
import inviter from './invitation/inviter'
import invitations from './invitations'
import invitedBy from './invitedBy'
import isFollower from './isFollower'
import isMember from './isMember'
import memberPrice from './member/price'
import memberUser from './member/user'
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
  Invitation: GQLInvitationTypeResolver
  Invitee: {
    __resolveType: GQLInviteeTypeResolver
  }
  Person: GQLPersonTypeResolver
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
    invitations,
    invitedBy,
  },

  CircleSetting: {
    enableBroadcast,
    enableDiscussion,
  },

  Member: {
    user: memberUser,
    price: memberPrice,
  },

  Price: {
    id: ({ id }) => (id ? toGlobalId({ type: 'Price', id }) : ''),
    circle: priceCircle,
  },

  Invitation: {
    id: ({ id }) => (id ? toGlobalId({ type: 'Invitation', id }) : ''),
    invitee,
    inviter,
    circle: invitationCircle,
    freePeriod,
  },

  Invitee: {
    __resolveType: ({ __type }: { __type: GQLPossibleInviteeTypeNames }) =>
      __type,
  },

  Person: {
    email: ({ email }) => email,
  },
}

export default circle
