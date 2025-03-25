import type {
  GQLCircleAnalyticsResolvers,
  GQLCircleContentAnalyticsResolvers,
  GQLCircleFollowerAnalyticsResolvers,
  GQLCircleIncomeAnalyticsResolvers,
  GQLCircleSubscriberAnalyticsResolvers,
  GQLCircleResolvers,
  GQLInvitationResolvers,
  GQLInviteeResolvers,
  GQLInvitesResolvers,
  GQLMemberResolvers,
  GQLPersonResolvers,
  GQLPriceResolvers,
  GQLQueryResolvers,
  GlobalId,
} from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import { toGlobalId } from '#common/utils/index.js'

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
  Query: GQLQueryResolvers

  Circle: GQLCircleResolvers
  Member: GQLMemberResolvers
  Price: GQLPriceResolvers
  Invites: GQLInvitesResolvers
  Invitation: GQLInvitationResolvers
  Invitee: GQLInviteeResolvers
  Person: GQLPersonResolvers
  CircleAnalytics: GQLCircleAnalyticsResolvers
  CircleIncomeAnalytics: GQLCircleIncomeAnalyticsResolvers
  CircleSubscriberAnalytics: GQLCircleSubscriberAnalyticsResolvers
  CircleFollowerAnalytics: GQLCircleFollowerAnalyticsResolvers
  CircleContentAnalytics: GQLCircleContentAnalyticsResolvers
} = {
  Query: {
    circle: rootCircle,
  },

  Circle: {
    id: ({ id }) =>
      id ? toGlobalId({ type: NODE_TYPES.Circle, id }) : ('' as GlobalId),
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
    id: ({ id }) =>
      id ? toGlobalId({ type: NODE_TYPES.Price, id }) : ('' as GlobalId),
    circle: priceCircle,
  },

  Invites,

  Invitation: {
    id: ({ id }) =>
      id ? toGlobalId({ type: NODE_TYPES.Invitation, id }) : ('' as GlobalId),
    invitee,
    inviter,
    circle: invitationCircle,
    freePeriod: ({ durationInDays }) => durationInDays,
    state: ({ state }) => state,
  },

  Invitee: {
    __resolveType: ({ __type }: any) => __type,
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
