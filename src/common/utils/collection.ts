import chunk from 'lodash/chunk.js'

export const circleChunk = <T>(array: T[], size: number) => {
  const chunks = chunk(array, size)
  if (chunks.length <= 1) {
    return chunks
  }
  const lastChunk = chunks[chunks.length - 1]
  const firstChunk = chunks[0]
  if (lastChunk.length < size) {
    lastChunk.push(...firstChunk.slice(0, size - lastChunk.length))
  }
  return chunks
}
