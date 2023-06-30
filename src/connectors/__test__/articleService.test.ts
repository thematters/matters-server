import { ArticleService } from 'connectors'

const articleService = new ArticleService()

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

test('update', async () => {
  const article = await articleService.baseUpdate('1', {
    state: 'archived',
  })
  expect(article.state).toEqual('archived')
})
