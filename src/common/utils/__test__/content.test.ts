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
      data: '<p><s><br></s></p>' + '<p><s><br class="smart"></s></p>',
      toBe: '<p><s><br></s></p>' + '<p><s><br class="smart"></s></p>',
    },
    {
      data: '<blockquote><br class="smart"></blockquote>',
      toBe: '<blockquote><br class="smart"></blockquote>',
    },
    {
      data: '<blockquote><s><br class="smart"></s></blockquote>',
      toBe: '<blockquote><s><br class="smart"></s></blockquote>',
    },
    {
      data: '<p><br class="smart"><br class="smart"></p>',
      toBe: '<p><br class="smart"><br class="smart"></p>',
    },
    {
      data: '<p><s><br class="smart"><br class="smart"></s></p>',
      toBe: '<p><s><br class="smart"><br class="smart"></s></p>',
    },
    {
      data: '<p><br class="smart">A<br class="smart">B</p>',
      toBe: '<p><br class="smart">A<br class="smart">B</p>',
    },
    {
      data: '<p><s><br class="smart">A<br class="smart">B</s></p>',
      toBe: '<p><s><br class="smart">A<br class="smart">B</s></p>',
    },
    {
      data: '<p><u><br class="smart">A</u><br class="smart">B</p>',
      toBe: '<p><u><br class="smart">A</u><br class="smart">B</p>',
    },
    {
      data: '<p><s><u><br class="smart">A</u></s><br class="smart">B</p>',
      toBe: '<p><s><u><br class="smart">A</u></s><br class="smart">B</p>',
    },
    {
      data: '<p><br class="smart"><br class="smart" /></br></p>',
      toBe: '<p><br class="smart"><br class="smart"></p>',
    },
    {
      data: '<p><u><br class="smart"><br class="smart" /></br></u></p>',
      toBe: '<p><u><br class="smart"><br class="smart"></u></p>',
    },
    {
      data: '<p><s><u><br class="smart"><br class="smart" /></br></u></s></p>',
      toBe: '<p><s><u><br class="smart"><br class="smart"></u></s></p>',
    },
    {
      data:
        '<p><em><s><u><br class="smart"><br class="smart" /></br></u></s></em></p>',
      toBe:
        '<p><em><s><u><br class="smart"><br class="smart"></u></s></em></p>',
    },
    {
      data: '<p><br class="smart"><br class="smart"/></br></p>',
      toBe: '<p><br class="smart"><br class="smart"/></br></p>',
    },
    {
      data: '<p><u><br class="smart"><br class="smart"/></br></u></p>',
      toBe: '<p><u><br class="smart"><br class="smart"/></br></u></p>',
    },
    {
      data:
        '<p><br class="smart"><br class="smart"><br class="smart" /></br></br></p>',
      toBe: '<p><br class="smart"><br class="smart"><br class="smart"></p>',
    },
    {
      data:
        '<p><u><br class="smart"><br class="smart"><br class="smart" /></br></br></u></p>',
      toBe:
        '<p><u><br class="smart"><br class="smart"><br class="smart"></u></p>',
    },
    {
      data:
        '<blockquote><br class="smart"><br class="smart"><br class="smart" /></br></br></blockquote>',
      toBe:
        '<blockquote><br class="smart"><br class="smart"><br class="smart"></blockquote>',
    },
    {
      data:
        '<blockquote><u><br class="smart"><br class="smart"><br class="smart" /></br></br></u></blockquote>',
      toBe:
        '<blockquote><u><br class="smart"><br class="smart"><br class="smart"></u></blockquote>',
    },
    {
      data: '<p><br class="not-smart"><br class="not-smart" /></br></p>',
      toBe: '<p><br class="not-smart"><br class="not-smart" /></br></p>',
    },
    {
      data: '<p><u><br class="not-smart"><br class="not-smart" /></br></u></p>',
      toBe: '<p><u><br class="not-smart"><br class="not-smart" /></br></u></p>',
    },
    {
      data: '<p><br class="smart">A<br class="smart" /></br></p>',
      toBe: '<p><br class="smart">A<br class="smart"></p>',
    },
    {
      data: '<p><u><br class="smart">A<br class="smart" /></br></u></p>',
      toBe: '<p><u><br class="smart">A<br class="smart"></u></p>',
    },
    {
      data:
        '<p><br class="smart">A<br class="smart">B<br class="smart" /></br></br></p>',
      toBe: '<p><br class="smart">A<br class="smart">B<br class="smart"></p>',
    },
    {
      data:
        '<p><u><br class="smart">A<br class="smart">B<br class="smart" /></br></br></u></p>',
      toBe:
        '<p><u><br class="smart">A<br class="smart">B<br class="smart"></u></p>',
    },
    {
      data:
        '<p><br class="smart">A is something... <br class="smart">B<br class="smart" /></br></br></p>',
      toBe:
        '<p><br class="smart">A is something... <br class="smart">B<br class="smart"></p>',
    },
    {
      data:
        '<p><u><br class="smart">A is something... <br class="smart">B<br class="smart" /></br></br></u></p>',
      toBe:
        '<p><u><br class="smart">A is something... <br class="smart">B<br class="smart"></u></p>',
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
        '<p><u><br class="smart">A is something... <br class="smart"><em>B</em><br class="smart" /></br></br></u></p>' +
        '<p><u><br class="smart">A is something... <br class="smart"><em>B</em>C<br class="smart" /></br></br></u></p>',
      toBe:
        '<p><u><br class="smart">A is something... <br class="smart"><em>B</em><br class="smart"></u></p>' +
        '<p><u><br class="smart">A is something... <br class="smart"><em>B</em>C<br class="smart"></u></p>',
    },
    {
      data:
        '<blockquote><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart" /></br></br></blockquote>',
      toBe:
        '<blockquote><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart"></blockquote>',
    },
    {
      data:
        '<blockquote><em><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart" /></br></br></em></blockquote>',
      toBe:
        '<blockquote><em><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart"></em></blockquote>',
    },
    {
      data:
        '<p><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart" /></br></p>',
      toBe:
        '<p><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart"></p>',
    },
    {
      data:
        '<p><s><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart" /></br></s></p>',
      toBe:
        '<p><s><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart"></s></p>',
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
        '<p><s><br class="smart">A is <a href="" target="_blank">here</a>.<br class="smart" /></br></s></p>' +
        '<p><s>A B C D <br class="smart">E <em>F</em><br class="smart" /></br></s></p>' +
        '<p><s>A B C D <br class="smart">E<br class="smart" /></br></s></p>',
      toBe:
        '<p><s><br class="smart">A is <a href="" target="_blank">here</a>.<br class="smart"></s></p>' +
        '<p><s>A B C D <br class="smart">E <em>F</em><br class="smart"></s></p>' +
        '<p><s>A B C D <br class="smart">E<br class="smart"></s></p>',
    },
    {
      data:
        '<p>A<br class="smart">B<br class="smart" /><br class="smart" /></br><br class="smart">C</br></p>' +
        '<p>A<br class="smart">B<br class="smart" />C<br class="smart" /></br><br class="smart">D</br></p>',
      toBe:
        '<p>A<br class="smart">B<br class="smart" /><br class="smart" /></br><br class="smart">C</p>' +
        '<p>A<br class="smart">B<br class="smart" />C<br class="smart" /></br><br class="smart">D</p>',
    },
    {
      data:
        '<p><s>A<br class="smart">B<br class="smart" /><br class="smart" /></br></s><br class="smart">C</br></p>' +
        '<p><s>A<br class="smart">B<br class="smart" />C<br class="smart" /></br></s><br class="smart">D</br></p>',
      toBe:
        '<p><s>A<br class="smart">B<br class="smart" /><br class="smart" /></br></s><br class="smart">C</p>' +
        '<p><s>A<br class="smart">B<br class="smart" />C<br class="smart" /></br></s><br class="smart">D</p>',
    },
    {
      data:
        '<p><a href="" target="_blank"><em><s><u>A<br class="smart"><br class="smart">o</u></s></em></a> B<br class="smart"></p>',
      toBe:
        '<p><a href="" target="_blank"><em><s><u>A<br class="smart"><br class="smart">o</u></s></em></a> B<br class="smart"></p>',
    },
  ]

  htmls.forEach(({ data, toBe }) => {
    expect(correctNestedBrTag()(data)).toBe(toBe)
  })
})
