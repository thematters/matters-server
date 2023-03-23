import { ArticleToDraftsResolver } from 'definitions'

import publishedResolver from './newestPublishedDraft.js'
import unpublishedResolver from './newestUnpublishedDraft.js'

const resolver: ArticleToDraftsResolver = async (
  parent,
  args,
  context,
  info
) => {
  const drafts = await Promise.all([
    unpublishedResolver(parent, args, context, info), // keep pending unpublished before published
    publishedResolver(parent, args, context, info),
  ])

  return drafts.filter((draft) => draft)
}

export default resolver
