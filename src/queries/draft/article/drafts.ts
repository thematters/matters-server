import { ArticleToDraftsResolver } from 'definitions'

import publishedResolver from './newestPublishedDraft'
import unpublishedResolver from './newestUnpublishedDraft'

const resolver: ArticleToDraftsResolver = async (
  parent,
  args,
  context,
  info
) => {
  const drafts = await Promise.all([
    publishedResolver(parent, args, context, info),
    unpublishedResolver(parent, args, context, info),
  ])

  return drafts.filter((draft) => draft)
}

export default resolver
