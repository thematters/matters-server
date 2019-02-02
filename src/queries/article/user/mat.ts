import pMap from 'p-map'

import { UserStatusToMATResolver } from 'definitions'

const resolver: UserStatusToMATResolver = async (
  { id },
  _: any,
  { dataSources: { articleService } }
) => {
  const articles = await articleService.findByAuthor(id)
  const apprecitions = (await pMap(
    articles,
    articles.map(
      async ({ id }: { id: string }) =>
        await articleService.totalAppreciation(id)
    )
  )) as number[]
  return apprecitions.reduce((a: number, b: number): number => a + b, 0)
}

export default resolver
