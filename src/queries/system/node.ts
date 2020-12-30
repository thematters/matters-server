import { EntityNotFoundError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { NodeTypes, QueryToNodeResolver } from 'definitions'

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
  const loaders = {
    Article: articleService.draftLoader,
    User: userService.dataloader,
    Comment: commentService.dataloader,
    Draft: draftService.dataloader,
    Tag: tagService.dataloader,
    Circle: atomService.circleIdLoader,
  }

  const { type, id: dbId } = fromGlobalId(id) as {
    type: NodeTypes
    id: string
  }
  const node = await loaders[type].load(dbId)

  if (!node) {
    throw new EntityNotFoundError('target does not exist')
  }

  if (type === 'Draft' && viewer.id !== node.authorId) {
    throw new ForbiddenError('only author is allowed to view draft')
  }

  return { ...node, __type: type }
}

export default resolver
