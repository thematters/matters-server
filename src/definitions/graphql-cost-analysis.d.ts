declare module 'graphql-cost-analysis' {
  export default function ({
    maximumCost,
    variables,
    defaultCost,
    costMap,
    complexityRange,
    onComplete,
    createError,
  }: {
    maximumCost: number
    variables?: any
    defaultCost?: number
    costMap?: any
    complexityRange?: { min: number; max: number }
    onComplete?: (cost: number) => void
    createError?: (maximumCost: number, cost: number) => void
  }): any
}
