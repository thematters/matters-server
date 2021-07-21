import { DraftToArticleResolver } from 'definitions'

const resolver: DraftToArticleResolver = (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  return atomService.findFirst({ table: 'article', where: { draftId: id } })
}

export default resolver
