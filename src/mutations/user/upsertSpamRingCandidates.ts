import type { GQLMutationResolvers } from '#definitions/index.js'

import { invalidateUserContentCaches } from './utils.js'

const resolver: GQLMutationResolvers['upsertSpamRingCandidates'] = async (
  _,
  { input: { candidates } },
  {
    dataSources: {
      spamRingService,
      articleService,
      connections: { redis },
    },
  }
) => {
  const mapped = candidates.map((c) => ({
    fingerprint: c.fingerprint,
    memberUserIds: c.memberUserIds ?? undefined,
    memberUserNames: c.memberUserNames ?? undefined,
    signals: c.signals,
    nArticles: c.nArticles,
    nAuthors: c.nAuthors,
    newAccountRatio: c.newAccountRatio ?? undefined,
    score: c.score ?? undefined,
    severity: c.severity ?? undefined,
    firstSeenAt: c.firstSeenAt ?? undefined,
    lastSeenAt: c.lastSeenAt ?? undefined,
    memberEvidence: c.memberEvidence ? JSON.parse(c.memberEvidence) : undefined,
  }))
  const result = await spamRingService.upsertCandidates(mapped)

  // purge content caches of members newly excluded this run, so the
  // detection-time restriction takes effect immediately instead of waiting
  // out the PUBLIC_QUERY TTL — mirrors the freeze/unfreeze/ring paths
  for (const userId of result.restrictedUserIds) {
    await invalidateUserContentCaches(userId, { articleService, redis })
  }

  return result
}

export default resolver
