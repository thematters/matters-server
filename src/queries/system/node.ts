import { Resolver, Context, NodeTypes } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root: any,
  { input: { id } }: { input: { id: string } },
  {
    dataSources: {
      articleService,
      userService,
      commentService,
      draftService,
      tagService
    }
  }: Context
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

  return { ...node, __type: type }
}

export default resolver
