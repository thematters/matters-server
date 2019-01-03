import { Resolver, MutationToRecallPublishResolver } from 'definitions'
import { PUBLISH_STATE } from 'common/enums'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToRecallPublishResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }
  const { id: dbId } = fromGlobalId(id)
  const draft = await draftService.baseUpdateById(dbId, {
    archived: true,
    publishState: PUBLISH_STATE.recalled
  })

  return draft
}

export default resolver
