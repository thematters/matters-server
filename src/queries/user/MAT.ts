import { sum } from 'lodash'

import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { articleService }) => {
  const articles = await articleService.findByAuthor({ id })
  const apprecations = await Promise.all(
    articles.map(({ id }: { id: string }) =>
      articleService.countAppreciation(id)
    )
  )
  return sum(apprecations)
}

export default resolver
