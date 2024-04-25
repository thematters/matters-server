import { fromGlobalId } from 'common/utils'
import { GQLMutationResolvers, TableName } from 'definitions'

const resolver: GQLMutationResolvers['putRemark'] = async (
  _,
  { input: { id, remark, type } },
  { dataSources: { systemService } }
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

  const entity = await systemService.baseUpdate<any>(dbId, { remark }, table)

  return entity.remark
}

export default resolver
