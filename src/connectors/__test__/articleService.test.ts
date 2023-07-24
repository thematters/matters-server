import { ArticleService, UserService } from 'connectors'

const articleService = new ArticleService()

let articleId: string

test('publish', async () => {
  // publish article to IPFS
  const publishedDraft = await articleService.draftLoader.load('1')
  const { mediaHash, contentHash: dataHash } =
    (await articleService.publishToIPFS(publishedDraft))!
  const articlePublished = await articleService.createArticle({
    draftId: '1',
    authorId: '1',
    title: 'test',
    slug: 'test',
    cover: '1',
    wordCount: 0,
    summary: 'test-summary',
    content: '<div>test-html-string</div>',
    dataHash,
    mediaHash,
  })
  expect(mediaHash).toBeDefined()
  expect(dataHash).toBeDefined()
  expect(articlePublished.state).toBe('pending')

  articleId = articlePublished.id
  // publish to IPNS
  // await articleService.publishFeedToIPNS({ userName: 'test1' })
})

test('sumAppreciation', async () => {
  const appreciation = await articleService.sumAppreciation('1')
  expect(appreciation).toBeDefined()
})

test('findByAuthor', async () => {
  const articles = await articleService.findByAuthor('1')
  expect(articles.length).toBeDefined()
  const articles2 = await articleService.findByAuthor('1', {
    orderBy: [{ column: 'updated_at', order: 'desc' }],
  })
  expect(articles2.length).toBeDefined()
})

test('findByCommentedAuthor', async () => {
  const articles = await articleService.findByCommentedAuthor({ id: '1' })
  expect(articles.length).toBeDefined()
})
test('countAppreciations', async () => {
  expect(await articleService.countAppreciations('1')).toBe(3)
  expect(await articleService.countAppreciations('0')).toBe(0)
})

test('findAppreciations', async () => {
  const appreciations = await articleService.findAppreciations({
    referenceId: '1',
  })
  expect(appreciations.length).toBe(3)

  const appreciations2 = await articleService.findAppreciations({
    referenceId: '1',
    take: 1,
  })
  expect(appreciations2.length).toBe(1)
  expect(appreciations[0].totalCount).toBe('3')
})

test('findTagIds', async () => {
  const tagIds = await articleService.findTagIds({ id: '1' })
  expect(tagIds.length).toEqual(2)
})

test('findSubscriptions', async () => {
  const subs = await articleService.findSubscriptions({ id: '2' })
  expect(subs.length).toEqual(2)
})

describe('updatePinned', () => {
  const getArticleFromDb = async (id: string) => articleService.baseFindById(id)
  test('invaild article id will throw error', async () => {
    await expect(articleService.updatePinned('999', '1', true)).rejects.toThrow(
      'Cannot find article'
    )
  })
  test('not author user id will throw error', async () => {
    await expect(articleService.updatePinned('1', '999', true)).rejects.toThrow(
      'Only author can pin article'
    )
  })
  test('success', async () => {
    let article = await new ArticleService().updatePinned('1', '1', true)
    expect(article.pinned).toBe(true)
    expect((await getArticleFromDb('1')).pinned).toBe(true)
    article = await new ArticleService().updatePinned('1', '1', true)
    expect(article.pinned).toBe(true)
    expect((await getArticleFromDb('1')).pinned).toBe(true)
  })
  test('cannot toggle more than 3 works', async () => {
    await articleService.updatePinned('4', '1', true)
    await articleService.updatePinned('6', '1', true)

    const userService = new UserService()
    const total = await userService.totalPinnedWorks('1')
    expect(total).toBe(3)
    await expect(
      articleService.updatePinned(articleId, '1', true)
    ).rejects.toThrow()
  })
})

test('update', async () => {
  const article = await articleService.baseUpdate('1', {
    state: 'archived',
  })
  expect(article.state).toEqual('archived')
})
