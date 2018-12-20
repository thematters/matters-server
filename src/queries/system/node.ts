import { Resolver, Context, NodeTypes } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root: any,
  { input: { id } }: { input: { id: string } },
  {
    articleService,
    userService,
    commentService,
    draftService,
    systemService,
    tagService
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
  const node = await serviceMap[type].idLoader.load(dbId)

  return { ...node, __type: type }
}

export default resolver
