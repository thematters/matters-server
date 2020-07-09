import _get from 'lodash/get'

import { toGlobalId } from 'common/utils'
import { GQLNodeInput, GQLPutTagInput } from 'definitions'

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
  mutation ($input: PutArticlesTagsInput!) {
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

const DELETE_ARTICLES_TAGS = `
  mutation ($input: UpdateArticlesTagsInput!) {
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

export const putTag = async (tag: GQLPutTagInput) => {
  const { mutate } = await testClient({
    isAdmin: true,
    isAuth: true,
    isMatty: true,
  })

  const result = await mutate({
    mutation: PUT_TAG,
    // @ts-ignore
    variables: { input: tag },
  })
  const data = result?.data?.putTag
  return data
}

describe('put tag', () => {
  test('create, query and update tag', async () => {
    const content = 'Test tag #1'
    const description = 'This is a tag description'

    // create
    const createResult = await putTag({ content, description })
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
      id: createTagId,
      content: updateContent,
      description: updateDescription,
    })
    expect(updateResult?.content).toBe(updateContent)
    expect(updateResult?.description).toBe(updateDescription)
  })
})

describe('manage tag', () => {
  test('rename and delete tag', async () => {
    // create
    const createResult = await putTag({ content: 'Test tag #1' })
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
    const createResult = await putTag({ content: 'Test tag #1' })
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
