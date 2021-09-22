import _ from 'lodash'

import { EntityNotFoundError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { QueryToNodeResolver } from 'definitions'

const resolver: QueryToNodeResolver = async (
  root,
  { input: { id } },
  {
    viewer,
    dataSources: {
      articleService,
      atomService,
      userService,
      commentService,
      draftService,
      tagService,
    },
  }
) => {
  const services = {
    Article: articleService.draftLoader,
    User: userService.dataloader,
    Comment: commentService.dataloader,
    Draft: draftService.dataloader,
    Tag: tagService.dataloader,
    Circle: atomService.circleIdLoader,
    Topic: atomService.topicIdLoader,
    Chapter: atomService.chapterIdLoader,
  }

  const { type, id: dbId } = fromGlobalId(id)
  const nodeService = _.get(services, type)

  if (!nodeService) {
    throw new EntityNotFoundError(`${type} is not supported yet`)
  }

  const node = await nodeService.load(dbId)

  if (!node) {
    throw new EntityNotFoundError('target does not exist')
  }

  if (type === 'Draft' && viewer.id !== node.authorId) {
    throw new ForbiddenError('only author is allowed to view draft')
  }

  return { ...node, __type: type }
}

export default resolver
