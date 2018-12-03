import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ articleUUID }, _, { articleService }) =>
  articleService.loader.load(articleUUID)

export default resolver
