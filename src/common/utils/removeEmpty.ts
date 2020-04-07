export const removeEmpty = (o: { [key: string]: any }) => {
  const obj = JSON.parse(JSON.stringify(o))

  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const cleaned = removeEmpty(obj[key])
      if (Object.keys(cleaned).length === 0) {
        delete obj[key]
      } else {
        obj[key] = cleaned
      }
    } else if (obj[key] === undefined || obj[key] === null) {
      delete obj[key]
    }
  })

  return obj
}
