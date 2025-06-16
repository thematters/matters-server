import type {
  Connections,
  ArticleVersion,
  Article,
  UserOAuthLikeCoin,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import { NODE_TYPES } from '#common/enums/index.js'
import { environment, isProd } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { AtomService, LikeCoin } from '#connectors/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import {
  ArticlePageContext,
  makeArticlePage,
} from '@matters/ipns-site-generator'
import { File } from '@web-std/file'
import * as Client from '@web3-storage/w3up-client'
import { Signer } from '@web3-storage/w3up-client/principal/ed25519'
import * as Proof from '@web3-storage/w3up-client/proof'
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory'
import * as cheerio from 'cheerio'
import { PinataSDK } from 'pinata-web3'

import { aws } from './index.js'

const logger = getLogger('service-ipfs-publication')

const TIMEOUT_ERR = 'Upload timeout'

export class IPFSPublicationService {
  private connections: Connections
  private knex: Knex
  private knexRO: Knex
  private models: AtomService
  private aws: typeof aws
  private likecoin: LikeCoin

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
    this.knex = connections.knex
    this.knexRO = connections.knexRO
    this.aws = aws
    this.likecoin = new LikeCoin(connections)
  }

  private async initStorachaClient() {
    if (!environment.storachaProofS3Bucket || !environment.storachaProofS3Key) {
      throw new Error(
        'STORACHA_PROOF_S3_BUCKET or STORACHA_PROOF_S3_KEY is not set'
      )
    }

    if (!environment.storachaPrivateKey) {
      throw new Error('STORACHA_PRIVATE_KEY is not set')
    }

    const proofFile = await this.aws.s3GetFile({
      bucket: environment.storachaProofS3Bucket,
      key: environment.storachaProofS3Key,
    })
    const proofString = await proofFile.Body?.transformToString()
    if (!proofString) {
      throw new Error('Proof is not set')
    }

    const principal = Signer.parse(environment.storachaPrivateKey)
    const store = new StoreMemory()
    const client = await Client.create({ principal, store })
    // Add proof that this agent has been delegated capabilities on the space
    const proof = await Proof.parse(proofString)
    const space = await client.addSpace(proof)
    await client.setCurrentSpace(space.did())

    return client
  }

  private initPinataClient() {
    if (
      !environment.pinataJwt ||
      !environment.pinataGateway ||
      !environment.pinataGroupId
    ) {
      throw new Error(
        'PINATA_JWT or PINATA_GATEWAY or PINATA_GROUP_ID is not set'
      )
    }
    const pinata = new PinataSDK({
      pinataJwt: environment.pinataJwt,
      pinataGateway: environment.pinataGateway,
    })

    return pinata
  }

  private async getAssetUrl(id: string) {
    const result = await this.knexRO('asset').where({ id }).first()

    if (!result) {
      return null
    }

    const envPrefix = isProd ? 'prod' : 'non-prod'
    const CLOUDFLARE_IMAGE_ENDPOINT = `https://imagedelivery.net/${environment.cloudflareAccountHash}/${envPrefix}`

    return `${CLOUDFLARE_IMAGE_ENDPOINT}/${result.path}/public`
  }

  private async publishToIPFS({
    article,
    articleVersion,
    content,
    skipAssets = false,
  }: {
    article: Article
    articleVersion: ArticleVersion
    content: string
    skipAssets?: boolean
  }) {
    const author = await this.models.findFirst({
      table: 'user',
      where: { id: article.authorId },
    })
    if (!author) {
      throw new Error('Author not found')
    }

    // prepare metadata
    const { id, title, summary, cover, tags, circleId, access, createdAt } =
      articleVersion
    const { displayName, userName } = author
    if (!userName || !displayName) {
      throw new Error('userName or displayName is missing')
    }

    const articleCoverImg = cover ? await this.getAssetUrl(cover) : null

    const publishedAt = createdAt.toISOString()
    const context: ArticlePageContext = {
      encrypted: false,
      meta: {
        title: `${title} - ${displayName} (${userName})`,
        description: summary,
        authorName: displayName,
        image: articleCoverImg ?? undefined,
      },
      byline: {
        date: publishedAt,
        author: {
          name: `${displayName} (${userName})`,
          userName,
          displayName,
          uri: `https://${environment.siteDomain}/@${userName}`,
        },
        website: {
          name: 'Matters',
          uri: `https://${environment.siteDomain}`,
        },
      },
      article: {
        id,
        author: {
          userName,
          displayName,
        },
        title,
        summary,
        date: publishedAt,
        content,
        tags: tags?.map((t: string) => t.trim()).filter(Boolean) || [],
      },
    }

    // paywalled content
    if (circleId && access === 'paywall') {
      context.encrypted = true
    }

    // make bundle and add content to ipfs
    logger.info(`Creating bundle ${skipAssets ? 'without' : 'with'} assets...`)
    const { bundle, key } = await makeArticlePage({
      ...context,
      skipAssets,
    })

    // upload directory to Storacha (web3.storage) and Pinata
    const storachaClient = await this.initStorachaClient()
    const pinata = this.initPinataClient()

    const files = bundle
      .filter((file): file is NonNullable<typeof file> => !!file)
      .map((file) => new File([file.content], file.path))

    logger.info(`Uploading bundle to IPFS...`)
    const storachaCid = await storachaClient.uploadDirectory(files)
    const contentHash = storachaCid.toString()
    const mediaHash = storachaCid.toV1().toString()

    logger.info(`Uploaded bundle ${skipAssets ? 'without' : 'with'} assets:`, {
      storacha: contentHash,
      storachaV1: mediaHash,
    })

    try {
      logger.info('Pinning to Pinata with CID:', contentHash)
      const pinataResult = await pinata.upload
        .cid(contentHash)
        .peerAddress([
          // https://docs.ipfs.tech/how-to/peering-with-content-providers/#web3-storage
          '/dns4/elastic.dag.house/tcp/4001/ipfs/bafzbeibhqavlasjc7dvbiopygwncnrtvjd2xmryk5laib7zyjor6kf3avm',
        ])
        .group(environment.pinataGroupId!)
        .addMetadata({ name: mediaHash })

      logger.info('pinata result:', pinataResult)
    } catch (error) {
      logger.error('failed to upload to pinata', error)
    }

    return { contentHash, mediaHash, key }
  }

  public async publish({
    articleId,
    articleVersionId,
  }: {
    articleId: string
    articleVersionId: string
  }) {
    const [articleVersion, article] = await Promise.all([
      this.models.findFirst({
        table: 'article_version',
        where: { id: articleVersionId },
      }),
      this.models.findFirst({
        table: 'article',
        where: { id: articleId },
      }),
    ])

    if (!articleVersion || !article) {
      throw new Error('Article version or article not found')
    }

    if (articleVersion.mediaHash && articleVersion.dataHash) {
      logger.info('Article version already published to IPFS', {
        mediaHash: articleVersion.mediaHash,
        dataHash: articleVersion.dataHash,
      })
      return
    }
    const articleContent = await this.models.findFirst({
      table: 'article_content',
      where: { id: articleVersion.contentId },
    })
    if (!articleContent) {
      throw new Error('Article content not found')
    }

    const $ = cheerio.load(articleContent.content)
    const imageCount = $('img').length
    const audioCount = $('audio source').length

    // Skip upload with assets if the number of images or audios
    // is greater than the threshold
    const skipAssets =
      imageCount > environment.uploadImageThreshold || audioCount > 0

    // publish to IPFS
    let mediaHash: string
    let dataHash: string
    let key: string | null | undefined

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(TIMEOUT_ERR)),
          environment.uploadTimeoutMs
        )
      })

      const uploadPromise = this.publishToIPFS({
        article,
        articleVersion,
        content: articleContent.content,
        skipAssets,
      })

      const result = await Promise.race([uploadPromise, timeoutPromise])
      mediaHash = result.mediaHash
      dataHash = result.contentHash
      key = result.key
    } catch (error) {
      const isTimeoutError =
        error instanceof Error && error.message === TIMEOUT_ERR

      // Retry without assets if timeout
      if (isTimeoutError) {
        console.log('Upload timed out, retrying without assets...')

        const retryPromise = this.publishToIPFS({
          article,
          articleVersion,
          content: articleContent.content,
          skipAssets: true,
        })

        const retryTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(TIMEOUT_ERR)),
            environment.uploadTimeoutMs
          )
        })
        const retryResult = await Promise.race([
          retryPromise,
          retryTimeoutPromise,
        ])

        mediaHash = retryResult.mediaHash
        dataHash = retryResult.contentHash
        key = retryResult.key
      } else {
        throw error
      }
    }
    // update article_version and article_circle in transaction
    await this.knex.transaction(async (trx) => {
      await trx('article_version')
        .where({ id: articleVersionId })
        .update({ dataHash, mediaHash })

      if (key && articleVersion.circleId) {
        await trx('article_circle')
          .where({ articleId, circleId: articleVersion.circleId })
          .update({ secret: key })
      }
    })

    // publish to ISCN
    try {
      const draft = await this.models.findFirst({
        table: 'draft',
        where: { articleId },
      })

      if (article && draft && draft.iscnPublish) {
        const author = await this.models.findFirst({
          table: 'user',
          where: { id: draft.authorId },
        })

        let liker: UserOAuthLikeCoin | undefined
        if (author?.likerId) {
          liker = await this.models.findFirst({
            table: 'user_oauth_likecoin',
            where: { likerId: author.likerId },
          })
        }

        if (liker && author) {
          const cosmosWallet = await this.likecoin.getCosmosWallet({ liker })

          const { displayName, userName } = author
          const iscnId = await this.likecoin.iscnPublish({
            mediaHash: `hash://sha256/${mediaHash}`,
            ipfsHash: `ipfs://${dataHash}`,
            cosmosWallet,
            userName: `${displayName} (@${userName})`,
            title: articleVersion.title,
            description: articleVersion.summary,
            datePublished: article.createdAt?.toISOString().substring(0, 10),
            url: `https://${environment.siteDomain}/a/${article.shortHash}`,
            tags: articleVersion.tags,
            liker,
          })

          await this.knex('article_version')
            .where({ id: articleVersionId })
            .update({ iscnId })
        }
      }
    } catch (err) {
      console.log('Failed to publish to ISCN')
      console.error(err)
    }

    // invalidate cache
    await invalidateFQC({
      node: { type: NODE_TYPES.Article, id: articleId },
      redis: this.connections.redis,
    })
  }
}
