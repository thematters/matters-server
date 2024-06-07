import type { User as UserFull, Connections } from 'definitions'

import { sanitizeHTML } from '@matters/matters-editor/transformers'

import { USER_STATE, JOURNAL_STATE } from 'common/enums'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from 'common/errors'
import { AtomService, UserService } from 'connectors'

type User = Pick<UserFull, 'id' | 'state'>

export class JournalService {
  private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
  }

  public create = async (
    data: { content: string; assetIds?: string[] },
    user: Pick<UserFull, 'id' | 'state' | 'userName'>
  ) => {
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to create journals`
      )
    }
    if (!user.userName) {
      throw new ForbiddenError('user has no username')
    }
    const content = sanitizeHTML(data.content)
    const journal = await this.models.create({
      table: 'journal',
      data: {
        authorId: user.id,
        content: content,
        state: JOURNAL_STATE.active,
      },
    })
    if (data.assetIds && data.assetIds.length > 0) {
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
    if (![USER_STATE.active, USER_STATE.banned].includes(user.state as any)) {
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
    const userService = new UserService(this.connections)
    const isBlocked = await userService.blocked({
      userId: journal.authorId,
      targetId: user.id,
    })
    if (isBlocked) {
      throw new ForbiddenError(`user ${id} is blocked by target author`)
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
