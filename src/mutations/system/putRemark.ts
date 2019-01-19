import { TableName, MutationToPutRemarkResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToPutRemarkResolver = async (
  root,
  { input: { id, remark, type } },
  { viewer, dataSources: { systemService } }
) => {
  const tableMap: { [key: string]: TableName } = {
    Article: 'article',
    User: 'user',
    Tag: 'tag',
    Comment: 'comment',
    Report: 'report',
    Feedback: 'feedback'
  }

  let dbId
  if (['Article', 'User', 'Tag', 'Comment'].includes(type)) {
    dbId = fromGlobalId(id).id
  } else {
    dbId = id
  }
  const table = tableMap[type]

  const entity = await systemService.baseUpdate(dbId, { remark }, table)

  return entity.remark
}

export default resolver
