import _get from 'lodash/get'

import { toGlobalId } from 'common/utils'
import {
  GQLNodeInput,
  GQLPutTagInput,
  GQLUpdateTagSettingInput,
  GQLUpdateTagSettingType,
} from 'definitions'

import { testClient } from './utils'

const QUERY_TAG = `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Tag {
        id
        content
        description
      }
    }
  }
`

const PUT_TAG = `
  mutation ($input: PutTagInput!) {
    putTag(input: $input) {
      id
      content
      description
      editors {
        id
      }
      owner {
        id
      }
    }
  }
`

const UPDATE_TAG_SETTING = `
  mutation ($input: UpdateTagSettingInput!) {
    updateTagSetting(input: $input) {
      id
      content
      editors {
        id
      }
      owner {
        id
      }
    }
  }
`

const RENAME_TAG = `
  mutation ($input: RenameTagInput!) {
    renameTag(input: $input) {
      id
      content
    }
  }
`

const MERGE_TAG = `
  mutation ($input: MergeTagsInput!) {
    mergeTags(input: $input) {
      ... on Tag {
        id
        content
        owner {
          id
        }
      }
    }
  }
`

const DELETE_TAG = `
  mutation ($input: DeleteTagsInput!) {
    deleteTags(input: $input)
  }
`

const ADD_ARTICLES_TAGS = `
  mutation ($input: AddArticlesTagsInput!) {
    addArticlesTags(input: $input) {
      id
      articles(input: { after: null, first: null, oss: true }) {
        edges {
          node {
            ... on Article {
              id
            }
          }
        }
      }
    }
  }
`

const UPDATE_ARTICLES_TAGS = `
  mutation ($input: UpdateArticlesTagsInput!) {
    updateArticlesTags(input: $input) {
      id
      articles(input: { after: null, first: null, oss: true }) {
        edges {
          node {
            ... on Article {
              id
            }
          }
        }
      }
    }
  }
`

const DELETE_ARTICLES_TAGS = `
  mutation ($input: DeleteArticlesTagsInput!) {
    deleteArticlesTags(input: $input) {
      id
      articles(input: { after: null, first: null, oss: true }) {
        edges {
          node {
            ... on Article {
              id
            }
          }
        }
      }
    }
  }
`

interface BaseInput {
  isAdmin?: boolean
  isAuth?: boolean
  isMatty?: boolean
}

type PutTagInput = { tag: GQLPutTagInput } & BaseInput

export const putTag = async ({
  isAdmin = true,
  isAuth = true,
  isMatty = true,
  tag,
}: PutTagInput) => {
  const { mutate } = await testClient({ isAdmin, isAuth, isMatty })
  const result = await mutate({
    mutation: PUT_TAG,
    // @ts-ignore
    variables: { input: tag },
  })
  const data = result?.data?.putTag
  return data
}

type UpdateTagSettingInput = GQLUpdateTagSettingInput & BaseInput

export const updateTagSetting = async ({
  isAdmin = false,
  isAuth = false,
  isMatty = false,
  id,
  type,
}: UpdateTagSettingInput) => {
  const { mutate } = await testClient({ isAdmin, isAuth, isMatty })
  const result = await mutate({
    mutation: UPDATE_TAG_SETTING,
    variables: { input: { id, type } },
  })

  if (!result.data) {
    return result
  }
  const data = result?.data?.updateTagSetting
  return data
}

describe('put tag', () => {
  test('create, query and update tag', async () => {
    const content = 'Test tag #1'
    const description = 'This is a tag description'

    // create
    const createResult = await putTag({ tag: { content, description } })
    const createTagId = createResult?.id
    expect(createTagId).toBeDefined()

    // query
    const { query } = await testClient({
      isAuth: true,
      isAdmin: true,
      isMatty: true,
    })
    const queryResult = await query({
      query: QUERY_TAG,
      // @ts-ignore
      variables: { input: { id: createTagId } },
    })
    expect(_get(queryResult, 'data.node.content')).toBe(content)
    expect(_get(queryResult, 'data.node.description')).toBe(description)

    // update
    const updateContent = 'Update tag #1'
    const updateDescription = 'Update description'
    const updateResult = await putTag({
      tag: {
        id: createTagId,
        content: updateContent,
        description: updateDescription,
      },
    })
    expect(updateResult?.content).toBe(updateContent)
    expect(updateResult?.description).toBe(updateDescription)
  })
})

describe('manage tag', () => {
  test('rename and delete tag', async () => {
    // create
    const createResult = await putTag({ tag: { content: 'Test tag #1' } })
    const createTagId = createResult?.id
    expect(createTagId).toBeDefined()

    const { mutate, query } = await testClient({
      isAuth: true,
      isAdmin: true,
      isMatty: true,
    })
    // rename
    const renameContent = 'Rename tag'
    const renameResult = await mutate({
      mutation: RENAME_TAG,
      variables: { input: { id: createTagId, content: renameContent } },
    })
    expect(renameResult?.data?.renameTag?.content).toBe(renameContent)

    // merge
    const mergeContent = 'Merge tag'
    const mergeResult = await mutate({
      mutation: MERGE_TAG,
      variables: { input: { ids: [createTagId], content: mergeContent } },
    })
    const mergeTagId = mergeResult?.data?.mergeTags?.id
    expect(mergeResult?.data?.mergeTags?.content).toBe(mergeContent)
    expect(mergeResult?.data?.mergeTags?.owner?.id).toBe(
      toGlobalId({ type: 'User', id: 6 })
    )

    // delete
    const deleteResult = await mutate({
      mutation: DELETE_TAG,
      variables: { input: { ids: [mergeTagId] } },
    })
    expect(deleteResult?.data?.deleteTags).toBe(true)
  })
})

describe('manage article tag', () => {
  test('add and delete article tag', async () => {
    // create
    const createResult = await putTag({ tag: { content: 'Test tag #1' } })
    const createTagId = createResult?.id
    expect(createTagId).toBeDefined()

    const { mutate, query } = await testClient({
      isAuth: true,
      isAdmin: true,
      isMatty: true,
    })

    const articleIds = [
      toGlobalId({ type: 'Article', id: 1 }),
      toGlobalId({ type: 'Article', id: 2 }),
    ]

    // add
    const addResult = await mutate({
      mutation: ADD_ARTICLES_TAGS,
      variables: {
        input: {
          id: createTagId,
          articles: articleIds,
        },
      },
    })
    expect(addResult?.data?.addArticlesTags?.articles?.edges.length).toBe(2)

    // update
    const updateResult = await mutate({
      mutation: UPDATE_ARTICLES_TAGS,
      variables: {
        input: {
          id: createTagId,
          articles: articleIds,
          isSelected: true,
        },
      },
    })
    expect(addResult?.data?.addArticlesTags?.articles?.edges.length).toBe(2)

    // remove
    const deleteResult = await mutate({
      mutation: DELETE_ARTICLES_TAGS,
      variables: {
        input: {
          id: createTagId,
          articles: articleIds,
        },
      },
    })
    expect(deleteResult?.data?.deleteArticlesTags?.articles?.edges.length).toBe(
      0
    )
  })
})

describe('manage settings of a tag', () => {
  const errorPath = 'errors.0.extensions.code'

  test('adopt and leave tag', async () => {
    const authedId = toGlobalId({ type: 'User', id: 1 })
    const mattyId = toGlobalId({ type: 'User', id: 6 })

    // matty create tag
    const tag = await putTag({ tag: { content: 'Tag adoption #1' } })
    const editors = (tag?.editors || []).map((editor: any) => editor?.id)
    expect(editors.includes(mattyId)).toBeTruthy()
    expect(tag?.owner?.id).toBe(mattyId)

    // authed user try adopt matty's tag
    const adoptMattyTagData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: GQLUpdateTagSettingType.adopt,
    })
    expect(_get(adoptMattyTagData, errorPath)).toBe('FORBIDDEN')

    // authed user try to leave matty's tag
    const leaveMattyTagData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: GQLUpdateTagSettingType.leave,
    })
    expect(_get(leaveMattyTagData, errorPath)).toBe('FORBIDDEN')

    // matty leave tag
    const mattyLeaveTagData = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: GQLUpdateTagSettingType.leave,
    })
    const mattyLeaveTagDataEditors = (mattyLeaveTagData?.editors || []).map(
      (editor: any) => editor?.id
    )
    expect(mattyLeaveTagDataEditors.includes(mattyId)).toBeTruthy()
    expect(mattyLeaveTagData?.owner).toBe(null)

    // authed user adopt tag
    const adoptData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: GQLUpdateTagSettingType.adopt,
    })
    const adoptDataEditors = (adoptData?.editors || []).map(
      (editor: any) => editor?.id
    )
    expect(adoptDataEditors.includes(authedId)).toBeTruthy()
    expect(adoptData?.owner?.id).toBe(authedId)

    // authed user leave tag
    const leaveData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: GQLUpdateTagSettingType.leave,
    })
    const leaveDataEditors = (leaveData?.editors || []).map(
      (editor: any) => editor?.id
    )
    expect(leaveDataEditors.includes(authedId)).toBeFalsy()
    expect(leaveDataEditors.includes(mattyId)).toBeTruthy()
    expect(leaveData?.owner).toBe(null)
  })
})
