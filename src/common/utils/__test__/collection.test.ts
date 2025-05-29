import { circleChunk } from '../collection.js'

describe('circleChunk', () => {
  it('should return empty array when input is empty', () => {
    expect(circleChunk([], 3)).toEqual([])
  })

  it('should chunk array into equal parts when evenly divisible', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const result = circleChunk(input, 3)
    expect(result).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ])
  })

  it('should fill last chunk with null when not evenly divisible', () => {
    const input = [1, 2, 3, 4, 5]
    const result = circleChunk(input, 3)
    expect(result).toEqual([
      [1, 2, 3],
      [4, 5, 1],
    ])
  })

  it('should handle single chunk case', () => {
    const input = [1, 2]
    const result = circleChunk(input, 3)
    expect(result).toEqual([[1, 2]])
  })

  it('should fill last chunk with first elements when needed', () => {
    const input = [1, 2, 3, 4]
    const result = circleChunk(input, 3)
    expect(result).toEqual([
      [1, 2, 3],
      [4, 1, 2],
    ])
  })
})
