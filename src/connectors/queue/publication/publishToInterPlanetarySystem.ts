import Bull from 'bull'
import { ArticleService } from 'connectors/articleService'
import { AtomService } from 'connectors/atomService'
import { PublishArticleData } from '../publication'
import { UserService } from 'connectors/userService'
import { Article, ArticleVersion, User, UserOAuthLikeCoin } from 'definitions'
import { environment } from 'common/environment'

export class PublishToInterPlanetarySystem {
  constructor(
    private readonly atomService: AtomService,
    private readonly articleService: ArticleService,
    private readonly userService: UserService
  ) {
    //
  }

  async handle(job: Bull.Job<PublishArticleData>): Promise<any> {
    const { draftId, iscnPublish } = job.data

    const draft = await this.atomService.draftIdLoader.load(draftId)

    if (!draft.articleId) {
      throw new Error(`Could not find the article with ID "${draft.articleId}".`)
    }

    const article = await this.atomService.articleIdLoader.load(draft.articleId)
    const articleVersion = await this.articleService.loadLatestArticleVersion(article.id)
    const author = await this.atomService.userIdLoader.load(article.authorId)

    const [dataHash, mediaHash, key] = await this.#publishToIpfs(
      article,
      articleVersion,
      draft.content
    )

    await this.#persistHashes(articleVersion, { dataHash, mediaHash })

    await job.progress(80)

    if (key && articleVersion.circleId) {
      this.#persistKey(article, articleVersion, key)
    }

    // Step: iscn publishing
    // handling both cases of set to true or false, but not omit (undefined)
    if (iscnPublish || draft.iscnPublish != null) {
      this.#registerIscn(article, articleVersion, author)
    }

    await job.progress(90)

    if (author.userName) {
      await this.articleService.publishFeedToIPNS({ userName: author.userName })
    }

    await job.progress(95)
  }

  async #publishToIpfs(article: Article, articleVersion: ArticleVersion, content: string) {
    const {
      contentHash,
      mediaHash,
      key,
    } = await this.articleService.publishToIPFS(
      article,
      articleVersion,
      content
    )

    return [contentHash, mediaHash, key]
  }

  async #persistHashes(
    articleVersion: ArticleVersion,
    hashes: { dataHash: string, mediaHash: string }
  ) {
    await this.atomService.update({
      table: 'article_version',
      data: {
        dataHash: hashes.dataHash,
        mediaHash: hashes.mediaHash,
      },
      where: { id: articleVersion.id },
    })
  }

  async #persistKey(article: Article, articleVersion: ArticleVersion, key: string) {
    if (!articleVersion.circleId) {
      return
    }

    const data = {
      articleId: article.id,
      circleId: articleVersion.circleId,
    }

    await this.atomService.update({
      table: 'article_circle',
      where: data,
      data: {
        ...data,
        secret: key,
        access: articleVersion.access,
      },
    })
  }

  async #registerIscn(article: Article, articleVersion: ArticleVersion, author: User) {
    const liker = (await this.userService.findLiker({
      userId: article.authorId,
    })) as UserOAuthLikeCoin

    const cosmosWallet = await this.userService.likecoin.getCosmosWallet({
      liker,
    })

    const { displayName, userName } = author

    const iscnId = await this.userService.likecoin.iscnPublish({
      mediaHash: `hash://sha256/${articleVersion.mediaHash}`,
      ipfsHash: `ipfs://${articleVersion.dataHash}`,
      cosmosWallet,
      userName: `${displayName} (@${userName})`,
      title: articleVersion.title,
      description: articleVersion.summary,
      datePublished: article.createdAt?.toISOString().substring(0, 10),
      url: `https://${environment.siteDomain}/a/${article.shortHash}`,
      tags: articleVersion.tags,
      liker,
    })

    await this.atomService.update({
      table: 'article_version',
      where: { id: article.id },
      data: { iscnId },
    })
  }
}
