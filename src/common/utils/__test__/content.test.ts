import { correctNestedBrTag, correctSelfClosingHtmlTag } from 'common/utils'

test('correctSelfClosingHtmlTag', async () => {
  const htmls = [
    {
      tag: 'iframe',
      data: '<p><iframe/></p>',
      toBe: '<p><iframe></iframe></p>',
    },
    {
      tag: 'iframe',
      data: '<p><iframe src=""/></p>',
      toBe: '<p><iframe src=""></iframe></p>',
    },
    {
      tag: 'iframe',
      data: '<p><iframe src="" /></p>',
      toBe: '<p><iframe src="" ></iframe></p>',
    },
    {
      tag: 'iframe',
      data: '<p><iframe src=""></iframe></p>',
      toBe: '<p><iframe src=""></iframe></p>',
    },
    {
      tag: 'iframe',
      data: '<p><iframe src=""/></p><p><iframe src=""/></p>',
      toBe: '<p><iframe src=""></iframe></p><p><iframe src=""></iframe></p>',
    },
    {
      tag: 'section',
      data: '<p><iframe src=""/></p><p><iframe src=""/></p>',
      toBe: '<p><iframe src=""/></p><p><iframe src=""/></p>',
    },
  ]

  htmls.forEach(({ tag, data, toBe }) => {
    expect(correctSelfClosingHtmlTag(tag)(data)).toBe(toBe)
  })
})

test('correctNestedBrTag', async () => {
  const htmls = [
    {
      data: '<p><br class="smart"></p>',
      toBe: '<p><br class="smart"></p>',
    },
    {
      data: '<p><br class="smart"><br class="smart" /></br></p>',
      toBe: '<p><br class="smart"><br class="smart"></p>',
    },
    {
      data:
        '<p><br class="smart"><br class="smart"><br class="smart" /></br></br></p>',
      toBe: '<p><br class="smart"><br class="smart"><br class="smart"></p>',
    },
    {
      data: '<blockquote><br class="smart"></blockquote>',
      toBe: '<blockquote><br class="smart"></blockquote>',
    },
    {
      data:
        '<blockquote><br class="smart"><br class="smart"><br class="smart" /></br></br></blockquote>',
      toBe:
        '<blockquote><br class="smart"><br class="smart"><br class="smart"></blockquote>',
    },
    {
      data: '<p><br class="not-smart"><br class="not-smart" /></br></p>',
      toBe: '<p><br class="not-smart"><br class="not-smart" /></br></p>',
    },
  ]

  htmls.forEach(({ data, toBe }) => {
    expect(correctNestedBrTag()(data)).toBe(toBe)
  })
})
