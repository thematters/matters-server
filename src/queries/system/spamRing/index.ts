import type {
  GQLSpamRingResolvers,
  GQLSpamRingMemberResolvers,
  GQLSpamRingEventResolvers,
  User,
} from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import {
  connectionFromArray,
  fromConnectionArgs,
  toGlobalId,
} from '#common/utils/index.js'

export const SpamRing: GQLSpamRingResolvers = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.SpamRing, id }),
  frozenBy: ({ frozenBy }, _, { dataSources: { atomService } }) =>
    frozenBy ? atomService.userIdLoader.load(frozenBy) : null,
  members: async ({ id }, { input }, { dataSources: { spamRingService } }) => {
    const { take, skip } = fromConnectionArgs(input)
    const [members, totalCount] = await spamRingService.findMembersAndCount(
      id,
      { take, skip }
    )
    return connectionFromArray(members, input, totalCount)
  },
  memberSample: async (
    { id },
    { limit },
    { dataSources: { atomService, spamRingService } }
  ) => {
    const members = await spamRingService.findMembers(id, limit ?? 5)
    const users = await Promise.all(
      members.map((m) => atomService.userIdLoader.load(m.userId))
    )
    return users.filter((u): u is User => Boolean(u))
  },
  events: ({ id }, _, { dataSources: { spamRingService } }) =>
    spamRingService.findEvents(id),
}

export const SpamRingMember: GQLSpamRingMemberResolvers = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.SpamRingMember, id }),
  user: ({ userId }, _, { dataSources: { atomService } }) =>
    atomService.userIdLoader.load(userId),
}

export const SpamRingEvent: GQLSpamRingEventResolvers = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.SpamRingEvent, id }),
  actor: ({ actorId }, _, { dataSources: { atomService } }) =>
    actorId ? atomService.userIdLoader.load(actorId) : null,
  detail: ({ detail }) => (detail ? JSON.stringify(detail) : null),
}
