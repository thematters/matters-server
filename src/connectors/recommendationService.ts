import type { Connections } from 'definitions'

import {
  MATTERS_CHOICE_TOPIC_STATE,
  MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS,
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

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(this.connections)
  }

  public createIcymiTopic = async ({
    title,
    articles,
    pinAmount,
    note,
  }: {
    title: string
    articles: string[]
    pinAmount: number
    note?: string
  }) => {
    if (!MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS.includes(pinAmount)) {
      throw new UserInputError('Invalid pin amount')
    }
    return this.models.create({
      table: 'matters_choice_topic',
      data: {
        title,
        articles,
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
      articles,
      pinAmount,
      note,
    }: {
      title?: string
      articles?: string[]
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
      data: { title, articles, pinAmount, note },
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
      for (const articleId of topic.articles) {
        this.models.upsert({
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
}
