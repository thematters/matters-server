import type { User, Connections } from 'definitions'
// import type { Knex } from 'knex'

import { USER_STATE, JOURNAL_STATE } from 'common/enums'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from 'common/errors'
import { AtomService } from 'connectors'

type Actor = Pick<User, 'id' | 'state'>

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
    actor: Actor
  ) => {
    if (actor.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${actor.state} user is not allowed to create journals`
      )
    }
    const journal = await this.models.create({
      table: 'journal',
      data: {
        authorId: actor.id,
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

  public delete = async (id: string, actor: Actor) => {
    if (actor.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${actor.state} user is not allowed to delete journals`
      )
    }
    const journal = await this.models.findUnique({
      table: 'journal',
      where: { id },
    })
    if (journal.authorId !== actor.id) {
      throw new ForbiddenError(
        `journal ${id} is not created by user ${actor.id}`
      )
    }
    return this.models.update({
      table: 'journal',
      where: { id, authorId: actor.id },
      data: { state: JOURNAL_STATE.archived },
    })
  }

  public like = async (id: string, actor: Actor) => {
    if (actor.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${actor.state} user is not allowed to like journals`
      )
    }
    const journal = await this.models.findUnique({
      table: 'journal',
      where: { id },
    })
    if (journal.authorId === actor.id) {
      throw new ForbiddenError(`user ${actor.id} cannot like own journal`)
    }
    if (journal.state !== JOURNAL_STATE.active) {
      throw new UserInputError(`journal ${id} is not active, cannot be liked`)
    }
    return this.models.upsert({
      table: 'action_journal',
      where: { targetId: id, userId: actor.id },
      create: { targetId: id, userId: actor.id, action: 'like' },
      update: {},
    })
  }

  public unlike = async (id: string, actor: Actor) =>
    this.models.deleteMany({
      table: 'action_journal',
      where: { targetId: id, userId: actor.id, action: 'like' },
    })

  public checkIfLiked = async (journalId: string, userId: string) => {
    const count = await this.models.count({
      table: 'action_journal',
      where: { targetId: journalId, userId: userId, action: 'like' },
    })
    return count > 0
  }
}
