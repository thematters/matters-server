import { ForbiddenError } from 'common/errors'
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
      tagService
    }
  }
) => {
  const serviceMap = {
    Article: articleService,
    User: userService,
    Comment: commentService,
    Draft: draftService,
    Tag: tagService
  }

  const { type, id: dbId } = fromGlobalId(id) as {
    type: NodeTypes
    id: string
  }
  const node = await serviceMap[type].dataloader.load(dbId)

  if (type === 'Draft' && viewer.id !== node.authorId) {
    throw new ForbiddenError('only author is allowed to view draft')
  }

  return { ...node, __type: type }
}

export default resolver
