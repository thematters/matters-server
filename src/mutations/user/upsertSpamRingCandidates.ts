import type { GQLMutationResolvers } from '#definitions/index.js'

const resolver: GQLMutationResolvers['upsertSpamRingCandidates'] = async (
  _,
  { input: { candidates } },
  { dataSources: { spamRingService } }
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
  return spamRingService.upsertCandidates(mapped)
}

export default resolver
