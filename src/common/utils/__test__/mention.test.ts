import { extractMentionIds } from 'common/utils'

test('normalizeQueryInput', async () => {
  const content = `<p><a class="mention" href="/@mengxiaobai" data-id="VXNlcjozNzA" data-user-name="mengxiaobai" data-display-name="志澤週" ref="noopener noreferrer nofollow"><span>@志澤週</span></a> test</p>`
  expect(extractMentionIds(content)).toEqual(['370'])
})
