import { Resolver, Context, NodeTypes, GQLSearchInput } from 'definitions'

const resolver: Resolver = (
  root: any,
  { input }: { input: GQLSearchInput },
  { articleService, userService, tagService }: Context
) => {
  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService
  }
  return serviceMap[input.type].search(input)
}

export default resolver
