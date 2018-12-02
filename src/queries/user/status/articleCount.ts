import { Resolver } from 'src/definitions'

const resolver: Resolver = async ({ id }, _, { articleService }) => {
  const articles = await articleService.findByAuthor(id)
  return articles.length
}

export default resolver
