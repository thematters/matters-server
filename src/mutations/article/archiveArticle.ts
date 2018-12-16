import { Resolver } from 'definitions'
import { PUBLISH_STATE } from 'common/enums'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = (root, { input: { id } }, { articleService }) => {
  const { id: dbId } = fromGlobalId(id)
  return articleService.update(dbId, { publishState: PUBLISH_STATE.archived })
}

export default resolver
