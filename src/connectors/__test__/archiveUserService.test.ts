import type { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

import { randomUUID } from 'crypto'

import {
  ARTICLE_STATE,
  ASSET_TYPE,
  PUBLISH_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import { ArchiveUserService } from '#connectors/index.js'
import { jest } from '@jest/globals'

import { genConnections, closeConnections } from './utils.js'
import { getLogger } from '#common/logger.js'

const logger = getLogger('service-archive-user')

let connections: Connections
let knex: Knex
let archiveUserService: ArchiveUserService

beforeAll(async () => {
  connections = await genConnections()
  knex = connections.knex
  archiveUserService = new ArchiveUserService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})

test('can not archive active users', async () => {
  expect(warn).not.toHaveBeenCalled()
  await archiveUserService.archiveUser('1')
  expect(warn).toHaveBeenCalled()
})

test('archive users not having data', async () => {
  const [user] = await createArchiveUserData({ hasData: false })
  await archiveUserService.archiveUser(user.id)
})

test('archive users having data', async () => {
  const [user] = await createArchiveUserData({ hasData: true })
  const [{ count: originalCount }] = await knex('draft')
    .where({ authorId: user.id })
    .count()
  expect(originalCount).toBe('3')

  await archiveUserService.archiveUser(user.id)

  // all draft removed
  const [{ count }] = await knex('draft').where({ authorId: user.id }).count()
  expect(count).toBe('0')

  // assets removed if not ref by article
  const [{ count: errorAssetCount }] = await knex('asset')
    .where({ path: 'cover/errorCover.jpg' })
    .count()
  const [{ count: publishedAssetCount }] = await knex('asset')
    .where({ path: 'cover/publishedCover.jpg' })
    .count()
  expect(errorAssetCount).toBe('0')
  expect(publishedAssetCount).toBe('1')

  // unpublished article removed
  const [{ count: unpublishedArticleCount }] = await knex('article')
    .where({ authorId: user.id })
    .whereIn('state', [ARTICLE_STATE.error, ARTICLE_STATE.pending])
    .count()
  expect(unpublishedArticleCount).toBe('0')

  // moment archived
  const moments = await knex('moment').where({ authorId: user.id })
  for (const moment of moments) {
    expect(moment.state).toBe('archived')
  }
})

// helpers

const createArchiveUserData = async ({ hasData }: { hasData: boolean }) => {
  const uuid = randomUUID()

  const [user] = await knex('user')
    .insert({
      uuid,
      user_name: 'archived-user' + uuid.slice(0, 4),
      display_name: 'archived-user',
      description: 'test user description',
      email: uuid.slice(0, 4) + '@matters.news',
      state: USER_STATE.archived,
    })
    .returning('id')

  await knex('moment').insert({
    author_id: user.id,
    state: 'active',
    content: 'test moment content',
    short_hash: 'short_hash' + randomUUID(),
  })

  const [
    { id: profileCoverId },
    { id: avatarId },
    { id: oauthClientAvatarId },
  ] = await knex('asset')
    .insert([
      {
        author_id: user.id,
        type: ASSET_TYPE.profileCover,
        uuid: randomUUID(),
        path: 'profileCover/profile.jpg',
      },
      {
        author_id: user.id,
        type: ASSET_TYPE.avatar,
        uuid: randomUUID(),
        path: 'avatar/avatar.jpg',
      },
      {
        author_id: user.id,
        type: ASSET_TYPE.oauthClientAvatar,
        uuid: randomUUID(),
        path: 'oauthClientAvatar/avatar.jpg',
      },
    ])
    .returning('id')

  await knex('user')
    .where({ id: user.id })
    .update({ profileCover: profileCoverId, avatar: avatarId })

  await knex('oauth_client').insert([
    {
      name: 'test_client' + randomUUID(),
      user_id: user.id,
      client_id: 'test_oauth_client' + randomUUID(),
      avatar: oauthClientAvatarId,
    },
  ])

  await knex('asset_map').insert([
    {
      asset_id: profileCoverId,
      entity_type_id: '1',
      entity_id: user.id,
    },
    {
      asset_id: avatarId,
      entity_type_id: '1',
      entity_id: user.id,
    },
    {
      asset_id: oauthClientAvatarId,
      entity_type_id: '1',
      entity_id: user.id,
    },
  ])

  if (hasData) {
    const [{ id: errorCoverId }, { id: publishedCoverId }] = await knex('asset')
      .insert([
        {
          author_id: user.id,
          type: ASSET_TYPE.cover,
          uuid: randomUUID(),
          path: 'cover/errorCover.jpg',
        },
        {
          author_id: user.id,
          type: ASSET_TYPE.cover,
          uuid: randomUUID(),
          path: 'cover/publishedCover.jpg',
        },
      ])
      .returning('id')

    // drafts
    const [_, errorDraft, publishedDraft] = await knex('draft')
      .insert([
        {
          author_id: user.id,
          title: 'test draft 1',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: PUBLISH_STATE.unpublished,
          tags: ['tag1', 'tag2'],
        },
        {
          author_id: user.id,
          title: 'test draft 2',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: PUBLISH_STATE.error,
          cover: errorCoverId,
        },
        {
          author_id: user.id,
          title: 'test draft 3',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: PUBLISH_STATE.published,
          cover: publishedCoverId,
        },
      ])
      .returning('id')

    await knex('asset_map').insert([
      {
        asset_id: errorCoverId,
        entity_type_id: '13',
        entity_id: errorDraft.id,
      },
      {
        asset_id: publishedCoverId,
        entity_type_id: '13',
        entity_id: publishedDraft.id,
      },
    ])

    // articles
    const [errorArticle, publishedArticle] = await knex('article')
      .insert([
        {
          author_id: user.id,
          state: ARTICLE_STATE.error,
        },
        {
          author_id: user.id,
          state: ARTICLE_STATE.active,
        },
      ])
      .returning('id')

    const [articleContent] = await knex('article_content')
      .insert([
        {
          content: '<div>some html string</div>',
          hash: 'testhash' + randomUUID(),
        },
      ])
      .returning('id')

    await knex('article_version').insert([
      {
        article_id: publishedArticle.id,
        content_id: articleContent.id,
        title: 'published article',
        summary: 'Some text',
        summary_customized: true,
        word_count: '1000',
        data_hash: 'someIpfsMediaHash4',
        media_hash: 'someIpfsMediaHash4',
        tags: [],
        connections: [],
        access: 'public',
        license: 'cc_by_nc_nd_4',
        can_comment: 'true',
        sensitive_by_author: 'false',
        cover: publishedCoverId,
      },
    ])
    await knex('asset_map').insert([
      {
        asset_id: publishedCoverId,
        entity_type_id: '4',
        entity_id: publishedArticle.id,
      },
    ])

    await knex('draft')
      .where('id', errorDraft.id)
      .update({ articleId: errorArticle.id })
    await knex('draft')
      .where('id', publishedDraft.id)
      .update({ articleId: publishedArticle.id })
    return [user, publishedDraft, errorArticle, publishedArticle]
  }
  return [user]
}
