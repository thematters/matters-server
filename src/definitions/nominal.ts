// https://www.carlos-menezes.com/post/branded-types
declare const _brand: unique symbol

type Nominal<Type, Brand> = Type & {
  readonly [_brand]: Brand
}

export type GlobalId = Nominal<string, 'GlobalId'>
