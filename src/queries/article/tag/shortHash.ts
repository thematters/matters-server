import type { GQLTagResolvers } from '#definitions/index.js'

import { shortHash as genShortHash } from '#common/utils/nanoid.js'

const resolver: GQLTagResolvers['shortHash'] = async (
  { id, shortHash },
  _args,
  { dataSources: { atomService } }
) => {
  if (shortHash) return shortHash
  const [{ shortHash: newShortHash }] = await atomService.upsertOnConflict({
    table: 'tag',
    create: {
      id,
      shortHash: genShortHash(),
    },
    onConflict: ['id'],
  })
  return newShortHash ?? ''
}

export default resolver
