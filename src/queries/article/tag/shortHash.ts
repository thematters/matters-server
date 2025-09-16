import type { GQLTagResolvers } from '#definitions/index.js'

import { shortHash as genShortHash } from '#common/utils/nanoid.js'

const resolver: GQLTagResolvers['shortHash'] = async (
  { id, shortHash },
  _args,
  { dataSources: { atomService } }
) => {
  if (shortHash) return shortHash
  const { shortHash: newShortHash } = await atomService.update({
    table: 'tag',
    where: {
      id,
    },
    data: {
      shortHash: genShortHash(),
    },
  })
  return newShortHash ?? ''
}

export default resolver
