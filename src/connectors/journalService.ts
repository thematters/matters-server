import type { User as UserFull, Connections } from 'definitions'
// import type { Knex } from 'knex'

import { USER_STATE, JOURNAL_STATE } from 'common/enums'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from 'common/errors'
import { AtomService } from 'connectors'

type User = Pick<UserFull, 'id' | 'state'>

export class JournalService {
  // private connections: Connections
  // private knex: Knex
  // private knexRO: Knex
  private models: AtomService

  public constructor(connections: Connections) {
    // this.connections = connections
    // this.knex = connections.knex
    // this.knexRO = connections.knexRO
    this.models = new AtomService(connections)
  }

  public create = async (
    data: { content: string; assetIds: string[] },
    user: User
  ) => {
    // TODO: sanitizeHTML content
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to create journals`
      )
    }
    const journal = await this.models.create({
      table: 'journal',
      data: {
        authorId: user.id,
        content: data.content,
        state: JOURNAL_STATE.active,
      },
    })
    if (data.assetIds.length > 0) {
      await Promise.all(
        data.assetIds.map((assetId) =>
          this.models.create({
            table: 'journal_asset',
            data: { assetId, journalId: journal.id },
          })
        )
      )
    }
    return journal
  }

  public delete = async (id: string, user: User) => {
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to delete journals`
      )
    }
    const journal = await this.models.findUnique({
      table: 'journal',
      where: { id },
    })
    if (journal.authorId !== user.id) {
      throw new ForbiddenError(
        `journal ${id} is not created by user ${user.id}`
      )
    }
    return this.models.update({
      table: 'journal',
      where: { id, authorId: user.id },
      data: { state: JOURNAL_STATE.archived },
    })
  }

  public like = async (id: string, user: User) => {
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to like journals`
      )
    }
    const journal = await this.models.findUnique({
      table: 'journal',
      where: { id },
    })
    if (journal.authorId === user.id) {
      throw new ForbiddenError(`user ${user.id} cannot like own journal`)
    }
    if (journal.state !== JOURNAL_STATE.active) {
      throw new UserInputError(`journal ${id} is not active, cannot be liked`)
    }
    return this.models.upsert({
      table: 'action_journal',
      where: { targetId: id, userId: user.id },
      create: { targetId: id, userId: user.id, action: 'like' },
      update: {},
    })
  }

  public unlike = async (id: string, user: User) =>
    this.models.deleteMany({
      table: 'action_journal',
      where: { targetId: id, userId: user.id, action: 'like' },
    })

  public isLiked = async (journalId: string, userId: string) => {
    const count = await this.models.count({
      table: 'action_journal',
      where: { targetId: journalId, userId: userId, action: 'like' },
    })
    return count > 0
  }

  public countLikes = async (journalId: string) =>
    this.models.count({
      table: 'action_journal',
      where: { targetId: journalId, action: 'like' },
    })

  public getAssets = async (journalId: string) => {
    const journalAssets = await this.models.findMany({
      table: 'journal_asset',
      where: { journalId },
      orderBy: [{ column: 'createdAt', order: 'asc' }],
    })
    return Promise.all(
      journalAssets.map((journalAsset) =>
        this.models.assetIdLoader.load(journalAsset.assetId)
      )
    )
  }
}
