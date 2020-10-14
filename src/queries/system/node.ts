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
      userService,
      commentService,
      draftService,
      tagService,
    },
  }
) => {
  const serviceMap = {
    Article: articleService,
    User: userService,
    Comment: commentService,
    Draft: draftService,
    Tag: tagService,
  }

  const { type, id: dbId } = fromGlobalId(id) as {
    type: NodeTypes
    id: string
  }
  let node = await serviceMap[type].dataloader.load(dbId)

  if (!node) {
    throw new EntityNotFoundError('target does not exist')
  }

  if (type === 'Article') {
    // fetch data from latest linked draft
    node = await draftService.dataloader.load(node.draftId)
  }
  if (type === 'Draft' && viewer.id !== node.authorId) {
    throw new ForbiddenError('only author is allowed to view draft')
  }

  return { ...node, __type: type }
}

export default resolver
