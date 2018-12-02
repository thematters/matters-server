import { Resolver } from 'src/definitions'

const resolver: Resolver = async ({ id }, _, { articleService }) => {
  const tags = await articleService.findTagsById(id)
  return tags.map((t: any) => t.tag)
}
export default resolver
