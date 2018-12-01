import lodash from 'lodash'

import { Resolver } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'

const resolver: Resolver = async (
  { id },
  _,
  { actionService, articleService }
) => {
  const articles = await articleService.findByAuthor(id)
  // const appreciateActions: AppreciationAction[] = await actionService.findActionByTargets(
  const appreciateActions = await actionService.findActionByTargets(
    USER_ACTION.appreciate,
    articles.map(({ id }) => id)
  )
  return lodash.sumBy(appreciateActions, 'detail')
}

export default resolver
