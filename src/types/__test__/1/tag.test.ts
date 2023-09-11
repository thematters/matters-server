import type {
  GQLPutTagInput,
  GQLUpdateTagSettingInput,
  Connections,
} from 'definitions'

import _difference from 'lodash/difference'
import _get from 'lodash/get'

import {
  NODE_TYPES,
  FEATURE_FLAG,
  FEATURE_NAME,
  UPDATE_TAG_SETTING_TYPE,
} from 'common/enums'
import { toGlobalId } from 'common/utils'

import {
  setFeature,
  testClient,
  genConnections,
  closeConnections,
} from '../utils'

declare global {
  // eslint-disable-next-line no-var
  var connections: Connections
}

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
  globalThis.connections = connections
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const QUERY_TAG = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Tag {
        id
        content
        description
        recommended(input: {}) {
          edges {
            node {
              ... on Tag {
                content
              }
            }
          }
        }
      }
    }
  }
`

const PUT_TAG = /* GraphQL */ `
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

const UPDATE_TAG_SETTING = /* GraphQL */ `
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

const RENAME_TAG = /* GraphQL */ `
  mutation ($input: RenameTagInput!) {
    renameTag(input: $input) {
      id
      content
    }
  }
`

const MERGE_TAG = /* GraphQL */ `
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

const DELETE_TAG = /* GraphQL */ `
  mutation ($input: DeleteTagsInput!) {
    deleteTags(input: $input)
  }
`

const ADD_ARTICLES_TAGS = /* GraphQL */ `
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

const UPDATE_ARTICLES_TAGS = /* GraphQL */ `
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

const DELETE_ARTICLES_TAGS = /* GraphQL */ `
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
  const server = await testClient({ isAdmin, isAuth, isMatty })
  const result = await server.executeOperation({
    query: PUT_TAG,
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
  editors,
}: UpdateTagSettingInput) => {
  const server = await testClient({ isAdmin, isAuth, isMatty })
  const result = await server.executeOperation({
    query: UPDATE_TAG_SETTING,
    variables: { input: { id, type, editors } },
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
    const expected = 'Test tag1'
    const description = 'This is a tag description'

    // create
    const createResult = await putTag({ tag: { content, description } })
    const createTagId = createResult?.id
    expect(createTagId).toBeDefined()

    // query
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      isMatty: true,
    })
    const { data, errors } = await server.executeOperation({
      query: QUERY_TAG,
      variables: { input: { id: createTagId } },
    })
    console.log(errors)
    expect(data.node.content).toBe(expected)
    expect(data.node.description).toBe(description)

    // update
    const updateContent = 'Update tag #1'
    const updateExpected = 'Update tag1'
    const updateDescription = 'Update description'
    const updateResult = await putTag({
      tag: {
        id: createTagId,
        content: updateContent,
        description: updateDescription,
      },
    })
    expect(updateResult?.content).toBe(updateExpected)
    expect(updateResult?.description).toBe(updateDescription)
  })
})

describe('manage tag', () => {
  test('rename and delete tag', async () => {
    // create
    const createResult = await putTag({ tag: { content: 'Test tag #1' } })
    const createTagId = createResult?.id
    expect(createTagId).toBeDefined()

    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      isMatty: true,
    })
    // rename
    const renameContent = 'Rename tag'
    const renameResult = await server.executeOperation({
      query: RENAME_TAG,
      variables: { input: { id: createTagId, content: renameContent } },
    })
    expect(renameResult?.data?.renameTag?.content).toBe(renameContent)

    // merge
    const mergeContent = 'Merge tag'
    const mergeResult = await server.executeOperation({
      query: MERGE_TAG,
      variables: { input: { ids: [createTagId], content: mergeContent } },
    })
    const mergeTagId = mergeResult?.data?.mergeTags?.id
    expect(mergeResult?.data?.mergeTags?.content).toBe(mergeContent)
    expect(mergeResult?.data?.mergeTags?.owner?.id).toBe(
      toGlobalId({ type: NODE_TYPES.User, id: 6 })
    )

    // delete
    const deleteResult = await server.executeOperation({
      query: DELETE_TAG,
      variables: { input: { ids: [mergeTagId] } },
    })
    expect(deleteResult?.data?.deleteTags).toBe(true)
  })
})

describe('manage article tag', () => {
  test('users w/o username can not add tags', async () => {
    const server = await testClient({ noUserName: true })
    const { errors } = await server.executeOperation({
      query: PUT_TAG,
      variables: { input: { content: 'faketag' } },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('add and delete article tag', async () => {
    // create
    const createResult = await putTag({ tag: { content: 'Test tag #1' } })
    const createTagId = createResult?.id
    expect(createTagId).toBeDefined()

    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      isMatty: true,
    })

    const articleIds = [
      toGlobalId({ type: NODE_TYPES.Article, id: 1 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 2 }),
    ]

    // add
    const addResult = await server.executeOperation({
      query: ADD_ARTICLES_TAGS,
      variables: {
        input: {
          id: createTagId,
          articles: articleIds,
        },
      },
    })
    expect(addResult?.data?.addArticlesTags?.articles?.edges.length).toBe(2)

    // update
    const updateResult = await server.executeOperation({
      query: UPDATE_ARTICLES_TAGS,
      variables: {
        input: {
          id: createTagId,
          articles: articleIds,
          isSelected: true,
        },
      },
    })
    expect(updateResult?.data?.updateArticlesTags?.articles?.edges.length).toBe(
      2
    )

    // remove
    const deleteResult = await server.executeOperation({
      query: DELETE_ARTICLES_TAGS,
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
  const editorFilter = (editor: any) => editor?.id

  test('adopt and leave tag', async () => {
    const authedId = toGlobalId({ type: NODE_TYPES.User, id: 1 })
    const mattyId = toGlobalId({ type: NODE_TYPES.User, id: 6 })

    // matty enable user can adopt tag
    await setFeature({
      isAdmin: true,
      isMatty: true,
      input: {
        name: FEATURE_NAME.tag_adoption,
        flag: FEATURE_FLAG.on,
      },
    })

    // matty create tag
    const tag = await putTag({ tag: { content: 'Tag adoption #1' } })
    const editors = (tag?.editors || []).map(editorFilter)
    expect(editors.includes(mattyId)).toBeTruthy()
    expect(tag?.owner?.id).toBe(mattyId)

    // authed user try adopt matty's tag
    const adoptMattyTagData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.adopt,
    })
    expect(_get(adoptMattyTagData, errorPath)).toBe('FORBIDDEN')

    // authed user try to leave matty's tag
    const leaveMattyTagData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.leave,
    })
    expect(_get(leaveMattyTagData, errorPath)).toBe('FORBIDDEN')

    // matty leave tag
    const mattyLeaveTagData = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.leave,
    })
    const mattyLeaveTagDataEditors = (mattyLeaveTagData?.editors || []).map(
      editorFilter
    )
    expect(mattyLeaveTagDataEditors.includes(mattyId)).toBeTruthy()
    expect(mattyLeaveTagData?.owner).toBe(null)

    // authed user adopt tag
    const adoptData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.adopt,
    })
    const adoptDataEditors = (adoptData?.editors || []).map(editorFilter)
    expect(adoptDataEditors.includes(authedId)).toBeTruthy()
    expect(adoptData?.owner?.id).toBe(authedId)

    // authed user leave tag
    const leaveData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.leave,
    })
    const leaveDataEditors = (leaveData?.editors || []).map(editorFilter)
    expect(leaveDataEditors.includes(authedId)).toBeFalsy()
    expect(leaveDataEditors.includes(mattyId)).toBeTruthy()
    expect(leaveData?.owner).toBe(null)
  })

  test('add and remove editor to a tag', async () => {
    const user1Id = toGlobalId({ type: NODE_TYPES.User, id: 1 })
    const user2Id = toGlobalId({ type: NODE_TYPES.User, id: 2 })
    const user3Id = toGlobalId({ type: NODE_TYPES.User, id: 3 })
    const user4Id = toGlobalId({ type: NODE_TYPES.User, id: 4 })
    const user7Id = toGlobalId({ type: NODE_TYPES.User, id: 7 })
    const mattyId = toGlobalId({ type: NODE_TYPES.User, id: 6 })
    const user9Id = toGlobalId({ type: NODE_TYPES.User, id: 9 })

    // matty create tag
    const tag = await putTag({ tag: { content: 'Tag editor #1' } })
    const editors = (tag?.editors || []).map(editorFilter)
    expect(editors.includes(mattyId)).toBeTruthy()
    expect(tag?.owner?.id).toBe(mattyId)

    // other try add editor
    const otherAddEditorData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.add_editor,
      editors: [user2Id],
    })
    expect(_get(otherAddEditorData, errorPath)).toBe('FORBIDDEN')

    // other try remove editor
    const otherRemoveEditorData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.remove_editor,
      editors: [user2Id],
    })
    expect(_get(otherRemoveEditorData, errorPath)).toBe('FORBIDDEN')

    // owner add self into edtor
    const addSelfData = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.add_editor,
      editors: [mattyId],
    })
    const addSelfDataEditors = (addSelfData?.editors || []).map(editorFilter)
    expect(addSelfDataEditors.includes(mattyId)).toBeTruthy()
    expect(addSelfData?.owner?.id).toBe(mattyId)

    // owner remove self from editor
    const rmSelfData = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.remove_editor,
      editors: [mattyId],
    })
    const rmSelfDataEditors = (rmSelfData?.editors || []).map(editorFilter)
    expect(rmSelfDataEditors.includes(mattyId)).toBeTruthy()
    expect(rmSelfData?.owner?.id).toBe(mattyId)

    // add other users
    const addData1 = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.add_editor,
      editors: [user1Id],
    })
    const addData1Editors = (addData1?.editors || []).map(editorFilter)
    expect(_difference(addData1Editors, [mattyId, user1Id]).length).toBe(0)
    expect(addData1?.editors.length).toBe(2)

    const addData2 = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.add_editor,
      editors: [user2Id, user3Id, user4Id],
    })
    const addData2Editors = (addData2?.editors || []).map(editorFilter)
    expect(
      _difference(addData2Editors, [
        mattyId,
        user1Id,
        user2Id,
        user3Id,
        user4Id,
      ]).length
    ).toBe(0)
    expect(addData2?.editors.length).toBe(5)

    const addData3 = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.add_editor,
      editors: [user7Id, user9Id],
    })
    expect(_get(addData3, errorPath)).toBe('TAG_EDITORS_REACH_LIMIT')

    // remove other users
    const rmData1 = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.remove_editor,
      editors: [user4Id],
    })
    const rmData1Editors = (rmData1?.editors || []).map(editorFilter)
    expect(rmData1Editors.includes(mattyId)).toBeTruthy()
    expect(rmData1Editors.includes(user1Id)).toBeTruthy()
    expect(rmData1Editors.includes(user2Id)).toBeTruthy()
    expect(rmData1Editors.includes(user3Id)).toBeTruthy()
    expect(rmData1Editors.includes(user4Id)).toBeFalsy()
    expect(rmData1?.editors.length).toBe(4)

    const rmData2 = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.remove_editor,
      editors: [user2Id, user3Id],
    })
    const rmData2Editors = (rmData2?.editors || []).map(editorFilter)
    expect(rmData2Editors.includes(mattyId)).toBeTruthy()
    expect(rmData2Editors.includes(user1Id)).toBeTruthy()
    expect(rmData2Editors.includes(user2Id)).toBeFalsy()
    expect(rmData2Editors.includes(user3Id)).toBeFalsy()
    expect(rmData2?.editors.length).toBe(2)

    const rmData3 = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.remove_editor,
      editors: [user1Id],
    })
    const rmData3Editors = (rmData3?.editors || []).map(editorFilter)
    expect(rmData3Editors.includes(mattyId)).toBeTruthy()
    expect(rmData3Editors.includes(user1Id)).toBeFalsy()
    expect(rmData3?.editors.length).toBe(1)

    // authed user create tag
    const authedUserTag = await putTag({
      isAdmin: false,
      isMatty: false,
      tag: { content: 'Tag editor #2' },
    })
    const authedUserTagEditors = (authedUserTag?.editors || []).map(
      editorFilter
    )
    expect(_difference(authedUserTagEditors, [mattyId, user1Id]).length).toBe(0)
    expect(authedUserTag?.owner?.id).toBe(user1Id)
    expect(authedUserTag?.editors.length).toBe(2)

    const authedUserAddData1 = await updateTagSetting({
      isAuth: true,
      id: authedUserTag.id,
      type: UPDATE_TAG_SETTING_TYPE.remove_editor,
      editors: [mattyId],
    })
    const authedUserAddData1Editors = (authedUserAddData1?.editors || []).map(
      editorFilter
    )
    expect(
      _difference(authedUserAddData1Editors, [mattyId, user1Id]).length
    ).toBe(0)
    expect(authedUserAddData1?.editors.length).toBe(2)

    const authedUserAddData2 = await updateTagSetting({
      isAuth: true,
      id: authedUserTag.id,
      type: UPDATE_TAG_SETTING_TYPE.add_editor,
      editors: [user1Id, user2Id],
    })
    const authedUserAddData2Editors = (authedUserAddData2?.editors || []).map(
      editorFilter
    )
    expect(
      _difference(authedUserAddData2Editors, [mattyId, user1Id, user2Id]).length
    ).toBe(0)
    expect(authedUserAddData2?.editors.length).toBe(3)

    const authedUserRmData1 = await updateTagSetting({
      isAuth: true,
      id: authedUserTag.id,
      type: UPDATE_TAG_SETTING_TYPE.remove_editor,
      editors: [mattyId],
    })
    const authedUserRmData1Editors = (authedUserRmData1?.editors || []).map(
      editorFilter
    )
    expect(authedUserRmData1Editors.includes(mattyId)).toBeTruthy()
    expect(authedUserRmData1?.editors.length).toBe(3)
  })

  test('leave editor from a tag', async () => {
    const user1Id = toGlobalId({ type: NODE_TYPES.User, id: 1 })
    // const user2Id = toGlobalId({ type: NODE_TYPES.User, id: 2 })
    const mattyId = toGlobalId({ type: NODE_TYPES.User, id: 6 })

    // matty create tag
    const tag = await putTag({ tag: { content: 'Tag editor #3' } })
    const editors = (tag?.editors || []).map(editorFilter)
    expect(editors.includes(mattyId)).toBeTruthy()
    expect(tag?.owner?.id).toBe(mattyId)

    // add editor
    const addData = await updateTagSetting({
      isAuth: true,
      isMatty: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.add_editor,
      editors: [user1Id],
    })
    const addDataEditors = (addData?.editors || []).map(editorFilter)
    expect(_difference(addDataEditors, [mattyId, user1Id]).length).toBe(0)
    expect(addData?.editors.length).toBe(2)

    // user leave from editors
    const leaveData = await updateTagSetting({
      isAuth: true,
      id: tag.id,
      type: UPDATE_TAG_SETTING_TYPE.leave_editor,
      editors: [user1Id],
    })
    const leaveDataEditors = (leaveData?.editors || []).map(editorFilter)
    expect(_difference(leaveDataEditors, [mattyId]).length).toBe(0)
    expect(leaveData?.editors.length).toBe(1)
  })
})

describe('query tag', () => {
  test('tag recommended', async () => {
    const server = await testClient()
    const { data } = await server.executeOperation({
      query: QUERY_TAG,
      variables: { input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) } },
    })
    expect(data!.node.recommended.edges).toBeDefined()
  })
})
