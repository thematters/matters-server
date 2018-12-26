import { Resolver, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  _: any,
  { dataSources: { articleService } }: Context
) => {
  const articles = await articleService.findByAuthor({ id })
  const apprecitions = ((await Promise.all(
    articles.map(
      async ({ id }: { id: string }) =>
        await articleService.countAppreciation(id)
    )
  )) as unknown) as number[]
  return apprecitions.reduce((a: number, b: number): number => a + b, 0)
}

export default resolver
