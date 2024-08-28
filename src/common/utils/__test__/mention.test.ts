import { extractMentionIds, stripMentions } from 'common/utils'

test('normalizeQueryInput', async () => {
  const content = `<p><a class="mention" href="/@mengxiaobai" data-id="VXNlcjozNzA" data-user-name="mengxiaobai" data-display-name="志澤週" ref="noopener noreferrer nofollow"><span>@志澤週</span></a> test</p>`
  expect(extractMentionIds(content)).toEqual(['370'])
})

test('strip mentions strips mention', () => {
  const content = `<p><a class="mention"><span>@Somebody</span></a> test</p>`
  expect(stripMentions(content)).toBe(`<p> test</p>`)
})

test('strip mentions strips multiple mentions', () => {
  const content = `<p><a class="mention"><span>@foo</span></a><a class="mention"><span>@bar</span></a> test</p>`
  expect(stripMentions(content)).toBe(`<p> test</p>`)
})
