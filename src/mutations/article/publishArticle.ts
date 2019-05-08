import { MutationToPublishArticleResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { PUBLISH_STATE, PUBLISH_ARTICLE_DELAY } from 'common/enums'

import publicationQueue from 'connectors/queue/publication'
import {
  AuthenticationError,
  DraftNotFoundError,
  DraftHasNoCoverError
} from 'common/errors'
import { extractAssetDataFromHtml } from 'common/utils'

const resolver: MutationToPublishArticleResolver = async (
  _,
  { input: { id, delay } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // retrive data from draft
  const { id: draftDBId } = fromGlobalId(id)
  const draft = await draftService.dataloader.load(draftDBId)
  if (
    draft.authorId !== viewer.id ||
    draft.archived ||
    draft.publishState === PUBLISH_STATE.published
  ) {
    throw new DraftNotFoundError('draft does not exists')
  }

  // check cover has been set or not
  const uuids = extractAssetDataFromHtml(draft.content) || []
  if (!draft.cover && uuids.length > 0) {
    throw new DraftHasNoCoverError('draft has no cover')
  }

  if (draft.publishState === PUBLISH_STATE.pending) {
    return draft
  }

  const scheduledAt = new Date(Date.now() + (delay || PUBLISH_ARTICLE_DELAY))
  const draftPending = await draftService.baseUpdate(draft.id, {
    publishState: PUBLISH_STATE.pending,
    scheduledAt,
    updatedAt: new Date()
  })

  // add job to queue
  publicationQueue.publishArticle({ draftId: draftDBId, delay })

  return draftPending
}

export default resolver
