import { Resolver } from 'src/definitions'
import { PUBLISH_STATE } from 'src/common/enums'

const resolver: Resolver = (root, { input: { uuid } }, { articleService }) =>
  articleService.updateByUUID(uuid, { publishState: PUBLISH_STATE.archived })

export default resolver
