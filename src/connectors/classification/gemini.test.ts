import { GenerativeModelPreview, VertexAI } from '@google-cloud/vertexai'

import { Gemini } from './gemini'

let mockClient: jest.Mocked<VertexAI>
let mockPreviewClient: jest.Mocked<VertexAI['preview']>
let mockGenerativeModel: jest.Mocked<GenerativeModelPreview>
let gemini: Gemini

beforeEach(() => {
  mockPreviewClient = {
    getGenerativeModel: jest.fn(),
  } as unknown as jest.Mocked<VertexAI['preview']>

  mockClient = {
    preview: mockPreviewClient,
    getGenerativeModel: jest.fn(),
  } as unknown as jest.Mocked<VertexAI>

  mockGenerativeModel = {
    generateContent: jest.fn(),
  } as unknown as jest.Mocked<GenerativeModelPreview>

  gemini = new Gemini(mockClient)
})

it('classifies HTML content', async () => {
  mockGenerativeModel.generateContent.mockImplementation(async () => ({
    response: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: JSON.stringify({ category: 'normal' }) }],
          },
          index: 0,
        },
      ],
    },
  }))
  mockPreviewClient.getGenerativeModel.mockImplementation(
    () => mockGenerativeModel
  )
  const result = await gemini.classify('<p>Hello world!</p>')
  expect(result).toBe('normal')
})

it('returns null if missing candidates', async () => {
  mockGenerativeModel.generateContent.mockImplementation(async () => ({
    response: {},
  }))
  mockPreviewClient.getGenerativeModel.mockImplementation(
    () => mockGenerativeModel
  )
  const result = await gemini.classify('<p>Hello world!</p>')
  expect(result).toBeNull()
})

it('returns null if missing parts in a candidate', async () => {
  mockGenerativeModel.generateContent.mockImplementation(async () => ({
    response: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [],
          },
          index: 0,
        },
      ],
    },
  }))
  mockPreviewClient.getGenerativeModel.mockImplementation(
    () => mockGenerativeModel
  )
  const result = await gemini.classify('<p>Hello world!</p>')
  expect(result).toBeNull()
})

it('returns null if text in a candidate part is not a valid json', async () => {
  mockGenerativeModel.generateContent.mockImplementation(async () => ({
    response: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'malformed' }],
          },
          index: 0,
        },
      ],
    },
  }))
  mockPreviewClient.getGenerativeModel.mockImplementation(
    () => mockGenerativeModel
  )
  const result = await gemini.classify('<p>Hello world!</p>')
  expect(result).toBeNull()
})

it('returns the next available candidate when error occurred', async () => {
  mockGenerativeModel.generateContent.mockImplementation(async () => ({
    response: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'malformed' }],
          },
          index: 0,
        },
        {
          content: {
            role: 'model',
            parts: [{ text: JSON.stringify({ category: 'normal' }) }],
          },
          index: 1,
        },
      ],
    },
  }))
  mockPreviewClient.getGenerativeModel.mockImplementation(
    () => mockGenerativeModel
  )
  const result = await gemini.classify('<p>Hello world!</p>')
  expect(result).toBe('normal')
})

it('returns null if the classificaion is not a predefined value', async () => {
  mockGenerativeModel.generateContent.mockImplementation(async () => ({
    response: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: JSON.stringify({ category: 'foo' }) }],
          },
          index: 0,
        },
      ],
    },
  }))
  mockPreviewClient.getGenerativeModel.mockImplementation(
    () => mockGenerativeModel
  )
  const result = await gemini.classify('<p>Hello world!</p>')
  expect(result).toBeNull()
})
