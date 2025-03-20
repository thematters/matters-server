import type { GlobalId } from '#definitions/nominal.js'

import { toGlobalId, fromGlobalId } from '#common/utils/globalId.js'
import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'

describe('globalId utils', () => {
  describe('toGlobalId', () => {
    it('should encode type and id into a base64 string', () => {
      const result = toGlobalId({
        type: NODE_TYPES.User,
        id: 123,
      })
      expect(result).toBe('VXNlcjoxMjM')
    })

    it('should handle string ids', () => {
      const result = toGlobalId({
        type: NODE_TYPES.User,
        id: '123',
      })
      expect(result).toBe('VXNlcjoxMjM')
    })
  })

  describe('fromGlobalId', () => {
    it('should decode valid global id', () => {
      const result = fromGlobalId('VXNlcjoxMjM' as GlobalId)
      expect(result).toEqual({
        type: NODE_TYPES.User,
        id: '123',
      })
    })

    it('should throw UserInputError for invalid id format', () => {
      expect(() => fromGlobalId('VXNlcjpub3RhbnVtYmVy' as GlobalId)).toThrow(
        UserInputError
      )
      expect(() => fromGlobalId('' as GlobalId)).toThrow(UserInputError)
    })

    it('should throw UserInputError for invalid type', () => {
      const result = toGlobalId({
        type: 'InvalidType' as NODE_TYPES,
        id: '123',
      })
      expect(() => fromGlobalId(result)).toThrow(UserInputError)
    })

    it('should throw UserInputError for invalid id', () => {
      const result = toGlobalId({
        type: NODE_TYPES.User,
        id: 'invalid-id',
      })
      expect(() => fromGlobalId(result)).toThrow(UserInputError)
    })
  })
})
