import { NODE_TYPES } from 'common/enums/index.js'
import { ForbiddenError } from 'common/errors.js'
import { toGlobalId } from 'common/utils/index.js'
import {
  GQLCircleAnalyticsTypeResolver,
  GQLCircleContentAnalyticsTypeResolver,
  GQLCircleFollowerAnalyticsTypeResolver,
  GQLCircleIncomeAnalyticsTypeResolver,
  GQLCircleSubscriberAnalyticsTypeResolver,
  GQLCircleTypeResolver,
  GQLInvitationTypeResolver,
  GQLInviteeTypeResolver,
  GQLInvitesTypeResolver,
  GQLMemberTypeResolver,
  GQLPersonTypeResolver,
  GQLPossibleInviteeTypeNames,
  GQLPriceTypeResolver,
  GQLQueryTypeResolver,
} from 'definitions'

import analytics from './analytics/index.js'
import avatar from './avatar.js'
import cover from './cover.js'
import followers from './followers.js'
import invitationCircle from './invitation/circle.js'
import invitee from './invitation/invitee.js'
import inviter from './invitation/inviter.js'
import invitedBy from './invitedBy.js'
import Invites from './invites/index.js'
import isFollower from './isFollower.js'
import isMember from './isMember.js'
import memberPrice from './member/price.js'
import memberUser from './member/user.js'
import members from './members.js'
import owner from './owner.js'
import priceCircle from './price/circle.js'
import prices from './prices.js'
import rootCircle from './rootCircle.js'
import works from './works.js'

const circle: {
  Query: GQLQueryTypeResolver

  Circle: GQLCircleTypeResolver
  Member: GQLMemberTypeResolver
  Price: GQLPriceTypeResolver
  Invites: GQLInvitesTypeResolver
  Invitation: GQLInvitationTypeResolver
  Invitee: {
    __resolveType: GQLInviteeTypeResolver
  }
  Person: GQLPersonTypeResolver
  CircleAnalytics: GQLCircleAnalyticsTypeResolver
  CircleIncomeAnalytics: GQLCircleIncomeAnalyticsTypeResolver
  CircleSubscriberAnalytics: GQLCircleSubscriberAnalyticsTypeResolver
  CircleFollowerAnalytics: GQLCircleFollowerAnalyticsTypeResolver
  CircleContentAnalytics: GQLCircleContentAnalyticsTypeResolver
} = {
  Query: {
    circle: rootCircle,
  },

  Circle: {
    id: ({ id }) => (id ? toGlobalId({ type: NODE_TYPES.Circle, id }) : ''),
    avatar,
    cover,
    prices,
    owner,
    members,
    followers,
    works,
    isFollower,
    isMember,
    invitedBy,
    invites: (root, _, { viewer }) => {
      if (!viewer.id || root.owner !== viewer.id) {
        throw new ForbiddenError('viewer has no permission')
      }
      return root
    },
    analytics: (root, _, { viewer }) => {
      if (!viewer.id || root.owner !== viewer.id) {
        throw new ForbiddenError('viewer has no permission')
      }
      return root
    },
  },

  Member: {
    user: memberUser,
    price: memberPrice,
  },

  Price: {
    id: ({ id }) => (id ? toGlobalId({ type: NODE_TYPES.Price, id }) : ''),
    circle: priceCircle,
  },

  Invites,

  Invitation: {
    id: ({ id }) => (id ? toGlobalId({ type: NODE_TYPES.Invitation, id }) : ''),
    invitee,
    inviter,
    circle: invitationCircle,
    freePeriod: ({ durationInDays }) => durationInDays,
    state: ({ state }) => state,
  },

  Invitee: {
    __resolveType: ({ __type }: { __type: GQLPossibleInviteeTypeNames }) =>
      __type,
  },

  Person: {
    email: ({ email }) => email,
  },

  CircleAnalytics: {
    income: (root) => root,
    subscriber: (root) => root,
    follower: (root) => root,
    content: (root) => root,
  },

  CircleIncomeAnalytics: analytics.CircleIncomeAnalytics,
  CircleSubscriberAnalytics: analytics.CircleSubscriberAnalytics,
  CircleFollowerAnalytics: analytics.CircleFollowerAnalytics,
  CircleContentAnalytics: analytics.CircleContentAnalytics,
}

export default circle
