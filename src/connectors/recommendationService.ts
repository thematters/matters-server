import type { Connections, Article } from 'definitions'
import type { Knex } from 'knex'

import {
  MATTERS_CHOICE_TOPIC_STATE,
  MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS,
  ARTICLE_STATE,
  DEFAULT_TAKE_PER_PAGE,
} from 'common/enums'
import {
  UserInputError,
  EntityNotFoundError,
  ActionFailedError,
} from 'common/errors'

import { AtomService } from './atomService'

export class RecommendationService {
  private connections: Connections
  private models: AtomService
  private knexRO: Knex

  public constructor(connections: Connections) {
    this.connections = connections
    this.knexRO = connections.knexRO
    this.models = new AtomService(this.connections)
  }

  public createIcymiTopic = async ({
    title,
    articleIds,
    pinAmount,
    note,
  }: {
    title: string
    articleIds: string[]
    pinAmount: number
    note?: string
  }) => {
    if (!MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS.includes(pinAmount)) {
      throw new UserInputError('Invalid pin amount')
    }
    const articles = await this.models.articleIdLoader.loadMany(articleIds)
    for (const article of articles) {
      if (!article || article.state !== ARTICLE_STATE.active) {
        throw new UserInputError('Invalid article')
      }
    }
    return this.models.create({
      table: 'matters_choice_topic',
      data: {
        title,
        articles: articleIds,
        pinAmount,
        note,
        state: MATTERS_CHOICE_TOPIC_STATE.editing,
      },
    })
  }

  public updateIcymiTopic = async (
    id: string,
    {
      title,
      articleIds,
      pinAmount,
      note,
    }: {
      title?: string
      articleIds?: string[]
      pinAmount?: number
      note?: string
    }
  ) => {
    if (
      pinAmount &&
      !MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS.includes(pinAmount)
    ) {
      throw new UserInputError('Invalid pin amount')
    }
    if (articleIds) {
      const articles = await this.models.articleIdLoader.loadMany(articleIds)
      for (const article of articles) {
        if (!article || article.state !== ARTICLE_STATE.active) {
          throw new UserInputError('Invalid article')
        }
      }
    }
    const topic = await this.models.findUnique({
      table: 'matters_choice_topic',
      where: { id },
    })
    if (!topic) {
      throw new EntityNotFoundError('Topic not found')
    }
    if (topic.state === MATTERS_CHOICE_TOPIC_STATE.archived) {
      throw new ActionFailedError('Invalid topic state')
    }
    return this.models.update({
      table: 'matters_choice_topic',
      where: { id },
      data: { title, articles: articleIds, pinAmount, note },
    })
  }

  public publishIcymiTopic = async (id: string) => {
    const topic = await this.models.findUnique({
      table: 'matters_choice_topic',
      where: { id },
    })
    if (!topic) {
      throw new EntityNotFoundError('Topic not found')
    }
    if (topic.state !== MATTERS_CHOICE_TOPIC_STATE.editing) {
      throw new ActionFailedError('Invalid topic state')
    }
    if (topic.articles.length < topic.pinAmount) {
      throw new ActionFailedError('Articles amount less than pinAmount')
    }
    const publisheds = await this.models.findMany({
      table: 'matters_choice_topic',
      where: { state: MATTERS_CHOICE_TOPIC_STATE.published },
    })
    await Promise.all(publisheds.map((t) => this.archiveIcymiTopic(t.id)))

    return this.models.update({
      table: 'matters_choice_topic',
      where: { id },
      data: {
        state: MATTERS_CHOICE_TOPIC_STATE.published,
        publishedAt: new Date(),
      },
    })
  }

  public archiveIcymiTopic = async (id: string) => {
    const topic = await this.models.findUnique({
      table: 'matters_choice_topic',
      where: { id },
    })
    if (topic.state === MATTERS_CHOICE_TOPIC_STATE.editing) {
      await this.models.deleteMany({
        table: 'matters_choice_topic',
        where: { id },
      })
      return null
    } else if (topic.state === MATTERS_CHOICE_TOPIC_STATE.published) {
      for (const articleId of topic.articles.reverse()) {
        await this.models.upsert({
          table: 'matters_choice',
          where: { articleId },
          create: { articleId },
          update: {},
        })
      }
      return this.models.update({
        table: 'matters_choice_topic',
        where: { id },
        data: { state: MATTERS_CHOICE_TOPIC_STATE.archived },
      })
    } else {
      throw new ActionFailedError('Invalid topic state')
    }
  }

  public findIcymiArticles = async ({
    take,
    skip,
  }: {
    take?: number
    skip?: number
  }) => {
    const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50
    const records = await this.knexRO
      .select(
        'article.*',
        this.knexRO.raw('COUNT(1) OVER() ::int AS total_count')
      )
      .from(
        this.knexRO
          .select()
          .from('matters_choice')
          .whereNotIn(
            'article_id',
            this.knexRO
              .select(this.knexRO.raw('UNNEST(articles)'))
              .from('matters_choice_topic')
              .where('state', MATTERS_CHOICE_TOPIC_STATE.published)
          )
          .orderBy('updated_at', 'desc')
          .limit(MAX_ITEM_COUNT)
          .as('choice')
      )
      .leftJoin('article', 'choice.article_id', 'article.id')
      .where({ state: ARTICLE_STATE.active })
      .modify((builder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    return [records as Article[], records[0]?.totalCount || 0]
  }
}
