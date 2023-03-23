import { fromGlobalId } from 'common/utils/index.js'
import { MutationToPutRemarkResolver, TableName } from 'definitions'

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
    Feedback: 'feedback',
  }

  const dbId = ['Article', 'User', 'Tag', 'Comment'].includes(type)
    ? fromGlobalId(id).id
    : id
  const table = tableMap[type]

  const entity = await systemService.baseUpdate(
    dbId,
    { remark, updatedAt: new Date() },
    table
  )

  return entity.remark
}

export default resolver
