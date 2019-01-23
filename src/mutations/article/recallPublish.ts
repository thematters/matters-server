import { MutationToRecallPublishResolver } from 'definitions'
import { PUBLISH_STATE } from 'common/enums'
import { fromGlobalId } from 'common/utils'
import { ForbiddenError, DraftNotFoundError } from 'common/errors'

const resolver: MutationToRecallPublishResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('visitor has no permission')
  }
  const { id: draftDBId } = fromGlobalId(id)
  const draft = await draftService.dataloader.load(draftDBId)

  if (
    draft.authorId !== viewer.id ||
    draft.archived ||
    draft.publishState === PUBLISH_STATE.published
  ) {
    throw new DraftNotFoundError('draft does not exists')
  }

  const draftRecalled = await draftService.baseUpdate(draftDBId, {
    archived: true,
    publishState: PUBLISH_STATE.unpublished
  })

  return draftRecalled
}

export default resolver
