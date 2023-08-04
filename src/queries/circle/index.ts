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
} from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { toGlobalId } from 'common/utils'

import analytics from './analytics'
import avatar from './avatar'
import cover from './cover'
import followers from './followers'
import invitationCircle from './invitation/circle'
import invitee from './invitation/invitee'
import inviter from './invitation/inviter'
import invitedBy from './invitedBy'
import Invites from './invites'
import isFollower from './isFollower'
import isMember from './isMember'
import memberPrice from './member/price'
import memberUser from './member/user'
import members from './members'
import owner from './owner'
import priceCircle from './price/circle'
import prices from './prices'
import rootCircle from './rootCircle'
import works from './works'

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
