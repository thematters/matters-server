export const randomText = (length: number) => {
  const adjs = [
    'autumn',
    'hidden',
    'bitter',
    'misty',
    'silent',
    'empty',
    'dry',
    'dark',
    'summer',
    'icy',
    'delicate',
    'quiet',
    'white',
    'cool',
    'spring',
    'winter',
    'patient',
    'twilight',
    'dawn',
    'crimson',
    'wispy',
    'weathered',
    'blue',
    'billowing',
    'broken',
    'cold',
    'damp',
    'falling',
    'frosty',
    'green',
    'long',
    'late',
    'lingering',
    'bold',
    'little',
    'morning',
    'muddy',
    'old',
    'red',
    'rough',
    'still',
    'small',
    'sparkling',
    'throbbing',
    'shy',
    'wandering',
    'withered',
    'wild',
    'black',
    'young',
    'holy',
    'solitary',
    'fragrant',
    'aged',
    'snowy',
    'proud',
    'floral',
    'restless',
    'divine',
    'polished',
    'ancient',
    'purple',
    'lively',
    'nameless'
  ]

  const nouns = [
    'waterfall',
    'river',
    'breeze',
    'moon',
    'rain',
    'wind',
    'sea',
    'morning',
    'snow',
    'lake',
    'sunset',
    'pine',
    'shadow',
    'leaf',
    'dawn',
    'glitter',
    'forest',
    'hill',
    'cloud',
    'meadow',
    'sun',
    'glade',
    'bird',
    'brook',
    'butterfly',
    'bush',
    'dew',
    'dust',
    'field',
    'fire',
    'flower',
    'firefly',
    'feather',
    'grass',
    'haze',
    'mountain',
    'night',
    'pond',
    'darkness',
    'snowflake',
    'silence',
    'sound',
    'sky',
    'shape',
    'surf',
    'thunder',
    'violet',
    'water',
    'wildflower',
    'wave',
    'water',
    'resonance',
    'sun',
    'wood',
    'dream',
    'cherry',
    'tree',
    'fog',
    'frost',
    'voice',
    'paper',
    'frog',
    'smoke',
    'star'
  ]

  return [...Array(length).keys()].map(i => {
    const pool = i % 2 === 0 ? adjs : nouns
    return pool[Math.floor(Math.random() * (pool.length - 1))]
  })
}

export const sequentialIds = (size: number) =>
  [...Array(size).keys()].map(i => String(i))

export const randomFrom = (
  items: any[],
  number: number,
  exclude?: any
): string[] => {
  let cleanItems = items
  if (exclude) {
    const itemsSet = new Set(items)
    itemsSet.delete(exclude)
    cleanItems = [...itemsSet]
  }

  const max = Math.min(cleanItems.length, number)

  const selections = new Set()
  while (selections.size !== max) {
    let selection = Math.floor(Math.random() * cleanItems.length)
    selections.add(selection)
  }
  return [...selections].map(i => cleanItems[i])
}

export const randomIds = (
  size: number,
  max: number,
  exclude?: string
): string[] => {
  return randomFrom(sequentialIds(max), size, exclude)
}

export const randomRepeatIds = (
  size: number,
  max: number,
  exclude?: string
): string[] => {
  let ids = sequentialIds(max)
  if (exclude) {
    const idsSet = new Set(ids)
    idsSet.delete(exclude)
    ids = [...idsSet]
  }
  let selections: string[] = []
  while (selections.length !== size) {
    let selection = ids[Math.floor(Math.random() * ids.length)]
    selections = [...selections, selection]
  }
  return selections
}
