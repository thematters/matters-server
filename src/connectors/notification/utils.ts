import lodash from 'lodash'

const { mergeWith, uniq } = lodash

const mergeDataCustomizer = (objValue: any, srcValue: any) => {
  if (Array.isArray(objValue)) {
    return uniq(objValue.concat(srcValue))
  }
}

export const mergeDataWith = (objValue: any, srcValue: any) =>
  mergeWith(objValue, srcValue, mergeDataCustomizer)
