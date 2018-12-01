import { Resolver } from 'src/definitions'

const resolver: Resolver = (root, { id }, { articleService }) =>
  articleService.updateById(id, { publishState: 'archived' })

export default resolver
