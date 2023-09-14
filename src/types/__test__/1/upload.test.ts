import type { Connections } from 'definitions'

import { createReadStream } from 'fs'
import { FileUpload, Upload } from 'graphql-upload'

import { AUDIO_ASSET_TYPE, IMAGE_ASSET_TYPE } from 'common/enums'
import { SystemService } from 'connectors'

import { genConnections, closeConnections, testClient } from '../utils'

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const SINGLE_FILE_UPLOAD = /* GraphQL */ `
  fragment Asset on Asset {
    __typename
    id
    path
    type
  }
  mutation SingleFileUpload($input: SingleFileUploadInput!) {
    singleFileUpload(input: $input) {
      __typename
      ...Asset
    }
  }
`
const createUpload = (mimetype: string) => {
  const file = createReadStream(__dirname)
  const fileUpload: FileUpload = {
    createReadStream: () => file as any,
    filename: 'some-filename',
    mimetype,
    encoding: 'some-encoding',
  }
  const upload = new Upload() as any
  upload.promise = new Promise((r) => r(fileUpload))
  upload.file = fileUpload
  return upload
}

describe('singleFileUpload', () => {
  test('upload files with wrong type', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: SINGLE_FILE_UPLOAD,
      variables: {
        input: {
          type: IMAGE_ASSET_TYPE.avatar,
          file: createUpload('audio/mpeg'),
          entityType: 'user',
        },
      },
    })
    expect(errors && errors[0].message).toBe('Invalid image format.')
  })
  test('upload images to cloudflare succeeded', async () => {
    const uploadCfsvc = jest.fn((type, _, uuid) => `${type}/${uuid}`)
    const uploadS3 = jest.fn((type, _, uuid) => `${type}/${uuid}`)
    const systemService = new SystemService(connections)
    // @ts-ignore
    systemService.cfsvc.baseUploadFile = uploadCfsvc as any
    // @ts-ignore
    systemService.aws.baseUploadFile = uploadS3 as any

    const server = await testClient({
      isAuth: true,
      dataSources: { systemService },
      connections,
    })
    const { errors } = await server.executeOperation({
      query: SINGLE_FILE_UPLOAD,
      variables: {
        input: {
          type: IMAGE_ASSET_TYPE.avatar,
          file: createUpload('image/jpeg'),
          entityType: 'user',
        },
      },
    })
    expect(uploadCfsvc).toHaveBeenCalled()
    expect(uploadS3).not.toHaveBeenCalled()
    expect(errors).toBeUndefined()
  })
  test('upload not-image files to s3 succeeded', async () => {
    const uploadCfsvc = jest.fn((type, _, uuid) => `${type}/${uuid}`)
    const uploadS3 = jest.fn((type, _, uuid) => `${type}/${uuid}`)
    const systemService = new SystemService(connections)
    // @ts-ignore
    systemService.cfsvc.baseUploadFile = uploadCfsvc as any
    // @ts-ignore
    systemService.aws.baseUploadFile = uploadS3 as any

    const server = await testClient({
      isAuth: true,
      dataSources: { systemService },
      connections,
    })
    const { errors } = await server.executeOperation({
      query: SINGLE_FILE_UPLOAD,
      variables: {
        input: {
          type: AUDIO_ASSET_TYPE.embedaudio,
          file: createUpload('audio/mpeg'),
          entityType: 'user',
        },
      },
    })
    expect(uploadCfsvc).not.toHaveBeenCalled()
    expect(uploadS3).toHaveBeenCalled()
    expect(errors).toBeUndefined()
  })
})
