import { UserStatusToMATResolver } from 'definitions'

const resolver: UserStatusToMATResolver = async (
  { id },
  _: any,
  { dataSources: { articleService } }
) => {
  const articles = await articleService.findByAuthor(id)
  const apprecitions = ((await Promise.all(
    articles.map(
      async ({ id }: { id: string }) =>
        await articleService.countAppreciation(id)
    )
  )) as unknown) as number[]
  return apprecitions.reduce((a: number, b: number): number => a + b, 0)
}

export default resolver
