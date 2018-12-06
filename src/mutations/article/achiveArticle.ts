import { Resolver } from 'definitions'
import { PUBLISH_STATE } from 'common/enums'

const resolver: Resolver = (root, { input: { uuid } }, { articleService }) =>
  articleService.updateByUUID(uuid, { publishState: PUBLISH_STATE.archived })

export default resolver
