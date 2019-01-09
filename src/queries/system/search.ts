import { QueryToSearchResolver } from 'definitions'

const resolver: QueryToSearchResolver = (
  root,
  { input },
  { dataSources: { articleService, userService, tagService } }
) => {
  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService
  }
  return serviceMap[input.type].search(input)
}

export default resolver
