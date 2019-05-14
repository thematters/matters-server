import { MutationToLogRecordResolver } from 'definitions'
import { ForbiddenError } from 'common/errors'

const resolver: MutationToLogRecordResolver = async (
  root,
  { input: { type } },
  { viewer, dataSources: { systemService } }
) => {
  if (type !== 'ReadFolloweeArticles' || !viewer.id) {
    throw new ForbiddenError('only authenticated user can log with this "type"')
  }

  await systemService.logRecord({
    userId: viewer.id,
    type: 'read_followee_articles'
  })

  return true
}

export default resolver
