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
      data: '<p><br></p>' + '<p><br class="smart"></p>',
      toBe: '<p><br></p>' + '<p><br class="smart"></p>',
    },
    {
      data: '<blockquote><br class="smart"></blockquote>',
      toBe: '<blockquote><br class="smart"></blockquote>',
    },
    {
      data: '<p><br class="smart"><br class="smart"></p>',
      toBe: '<p><br class="smart"><br class="smart"></p>',
    },
    {
      data: '<p><br class="smart">A<br class="smart">B</p>',
      toBe: '<p><br class="smart">A<br class="smart">B</p>',
    },
    {
      data: '<p><br class="smart"><br class="smart" /></br></p>',
      toBe: '<p><br class="smart"><br class="smart"></p>',
    },
    {
      data: '<p><br class="smart"><br class="smart"/></br></p>',
      toBe: '<p><br class="smart"><br class="smart"/></br></p>',
    },
    {
      data:
        '<p><br class="smart"><br class="smart"><br class="smart" /></br></br></p>',
      toBe: '<p><br class="smart"><br class="smart"><br class="smart"></p>',
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
    {
      data: '<p><br class="smart">A<br class="smart" /></br></p>',
      toBe: '<p><br class="smart">A<br class="smart"></p>',
    },
    {
      data:
        '<p><br class="smart">A<br class="smart">B<br class="smart" /></br></br></p>',
      toBe: '<p><br class="smart">A<br class="smart">B<br class="smart"></p>',
    },
    {
      data:
        '<p><br class="smart">A is something... <br class="smart">B<br class="smart" /></br></br></p>',
      toBe:
        '<p><br class="smart">A is something... <br class="smart">B<br class="smart"></p>',
    },
    {
      data:
        '<p><br class="smart">A is something... <br class="smart"><em>B</em><br class="smart" /></br></br></p>' +
        '<p><br class="smart">A is something... <br class="smart"><em>B</em>C<br class="smart" /></br></br></p>',
      toBe:
        '<p><br class="smart">A is something... <br class="smart"><em>B</em><br class="smart"></p>' +
        '<p><br class="smart">A is something... <br class="smart"><em>B</em>C<br class="smart"></p>',
    },
    {
      data:
        '<blockquote><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart" /></br></br></blockquote>',
      toBe:
        '<blockquote><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart"></blockquote>',
    },
    {
      data:
        '<p><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart" /></br></p>',
      toBe:
        '<p><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart"></p>',
    },
    {
      data:
        '<p><br class="smart">A is <a href="" target="_blank">here</a>.<br class="smart" /></br></p>' +
        '<p>A B C D <br class="smart">E <em>F</em><br class="smart" /></br></p>' +
        '<p>A B C D <br class="smart">E<br class="smart" /></br></p>',
      toBe:
        '<p><br class="smart">A is <a href="" target="_blank">here</a>.<br class="smart"></p>' +
        '<p>A B C D <br class="smart">E <em>F</em><br class="smart"></p>' +
        '<p>A B C D <br class="smart">E<br class="smart"></p>',
    },
    {
      data:
        '<p>A<br class="smart">B<br class="smart" /><br class="smart" /></br><br class="smart">B</br></p>' +
        '<p>A<br class="smart">B<br class="smart" />C<br class="smart" /></br><br class="smart">B</br></p>',
      toBe:
        '<p>A<br class="smart">B<br class="smart" /><br class="smart" /></br><br class="smart">B</p>' +
        '<p>A<br class="smart">B<br class="smart" />C<br class="smart" /></br><br class="smart">B</p>',
    },
  ]

  htmls.forEach(({ data, toBe }) => {
    expect(correctNestedBrTag()(data)).toBe(toBe)
  })
})
