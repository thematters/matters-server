import { MutationToLogRecordResolver } from 'definitions'
import { ForbiddenError } from 'common/errors'

const resolver: MutationToLogRecordResolver = async (
  root,
  { input: { type } },
  { viewer, dataSources: { systemService } }
) => {
  const types = {
    ReadFolloweeArticles: 'read_followee_articles',
    ReadResponseInfoPopUp: 'read_response_info_pop_up'
  }

  if (!(type in types) || !viewer.id) {
    throw new ForbiddenError('only authenticated user can log with this "type"')
  }

  await systemService.logRecord({
    userId: viewer.id,
    type: types[type]
  })

  return true
}

export default resolver
