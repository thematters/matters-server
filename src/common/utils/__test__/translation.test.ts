import {
  ERROR_TRANSLATION_SEGMENTS_MISMATCH,
  extractAndTranslateHtml,
} from '#common/utils/translation.js'
import * as cheerio from 'cheerio'
import { jest } from '@jest/globals'

type MockTranslator = (
  texts: string[]
) => Promise<{ translations: string[]; model: any }>

describe('extractAndTranslateHtml', () => {
  const testHtml = `
    <div>
      <p>Hello world</p>
      <script>console.log("This should be ignored")</script>
      <span>Test</span>
      <style>.class { color: red; }</style>
    </div>
  `

  test('should extract text nodes and apply translations', async () => {
    // Create a mock translator function
    const mockTranslator = jest.fn<MockTranslator>().mockResolvedValue({
      translations: ['你好世界', '测试'],
      model: 'google_gemini_2_5_flash_preview',
    })

    const result = await extractAndTranslateHtml(testHtml, mockTranslator)

    // Should have called the translator with the right texts
    expect(mockTranslator).toHaveBeenCalledWith(['Hello world', 'Test'])

    // Check result structure
    expect(result).toEqual({
      html: expect.any(String),
      model: 'google_gemini_2_5_flash_preview',
    })

    // Verify translations were applied correctly
    const $ = cheerio.load(result!.html)
    expect($('p').text()).toBe('你好世界')
    expect($('span').text()).toBe('测试')

    // Verify ignored elements are intact
    expect($('script').text()).toBe('console.log("This should be ignored")')
    expect($('style').text()).toBe('.class { color: red; }')
  })

  test('should return undefined for empty HTML', async () => {
    const emptyHtml = '<p></p>'
    const mockTranslator = jest.fn<MockTranslator>()

    const result = await extractAndTranslateHtml(emptyHtml, mockTranslator)

    // Should not call the translator
    expect(mockTranslator).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  test('should handle translation errors', async () => {
    // Create a translator that throws an error
    const errorTranslator = jest
      .fn<MockTranslator>()
      .mockRejectedValue(new Error(ERROR_TRANSLATION_SEGMENTS_MISMATCH))

    await expect(
      extractAndTranslateHtml(testHtml, errorTranslator)
    ).rejects.toThrow(ERROR_TRANSLATION_SEGMENTS_MISMATCH)
  })

  test('should handle complex HTML with nested elements', async () => {
    const complexHtml = `
      <p><br class="smart" /></p>
      <p>內容：一張海報，它的简化率只有4.5%，比另一道地狱级数独“Escargot”的5.0%还低，也就是说，几乎没有“简单的第一步”</p>
      <blockquote>
          <p>內容：基於之前討論過的方式與我們提供了的兩組文本</p>
          <p>日期：本周出草圖，推進討論</p>
      </blockquote>
      <p>
          下方：要放得下金句（已選金句<a target="_blank" rel="noopener noreferrer nofollow" href="https://docs.google.com/document/d/16pm9LqoQlId8qsUmvC1iEHE8QSdWrBWt2bLJazbX8Ys/edit?tab=t.0"><strong>這裡</strong></a>，在 page 4）
      </p>
      <pre><code>欣然 一目, [29/4/2025 01:42]我草</code></pre>
      <figure class="image">
          <img src="https://imagedelivery.net/kDRCweMmqLnTPNlbum-pYA/non-prod/embed/94a5b539-8323-44d5-beee-91784341def1.jpeg/public" />
          <figcaption>它的简化率只有4.5%，比另一道地狱级数独“Escargot”的5.0%还低，也就是说，几乎没有“简单的第一步”</figcaption>
      </figure>
      <p>對於這次旅行我唯一期待的就是吃——我大概知道旅行的內容是什麼樣的，與其說去考察，不如說就是拍攝那些在新聞敘述中常被描繪為「新西藏建設成果」的地方，把宣傳成果帶回去，發布之後，玉樹開心了，我們本地的媒體也開心了，雙贏，其他大多是無聊的活動。</p>
      <figure class="embed embed-video" data-provider="youtube">
          <div class="iframe-container"><iframe src="https://www.youtube.com/embed/?rel=0" loading="lazy" allowfullscreen frameborder="0"></iframe></div>
          <figcaption>飛機降落在玉樹巴塘機場時，窗外是寂靜的草色的原野與遠處的雪山，很漂亮。十月，風吹過來的時候讓穿棉衣的我都打了個哆嗦，因為是第一次到卓嘎的家鄉來，我依然非常興奮。我發了圖片給卓嘎，卓嘎說玉樹很大，她家在囊謙，離這裡很遠。</figcaption>
      </figure>
      <p>Nvidia <a class="mention" href="/@yihanhuangmo" data-id="VXNlcjozNTQ0" data-user-name="yihanhuangmo" data-display-name="Syo。翔" rel="noopener noreferrer nofollow"><span>@Syo。翔</span></a></p><p><br class="smart"></p>
    `

    // Expected text nodes to extract (order matters)
    const expectedTexts = [
      '內容：一張海報，它的简化率只有4.5%，比另一道地狱级数独“Escargot”的5.0%还低，也就是说，几乎没有“简单的第一步”',
      '內容：基於之前討論過的方式與我們提供了的兩組文本',
      '日期：本周出草圖，推進討論',
      '\n          下方：要放得下金句（已選金句',
      '，在 page 4）\n      ',
      '這裡',
      '欣然 一目, [29/4/2025 01:42]我草',
      '它的简化率只有4.5%，比另一道地狱级数独“Escargot”的5.0%还低，也就是说，几乎没有“简单的第一步”',
      '對於這次旅行我唯一期待的就是吃——我大概知道旅行的內容是什麼樣的，與其說去考察，不如說就是拍攝那些在新聞敘述中常被描繪為「新西藏建設成果」的地方，把宣傳成果帶回去，發布之後，玉樹開心了，我們本地的媒體也開心了，雙贏，其他大多是無聊的活動。',
      '飛機降落在玉樹巴塘機場時，窗外是寂靜的草色的原野與遠處的雪山，很漂亮。十月，風吹過來的時候讓穿棉衣的我都打了個哆嗦，因為是第一次到卓嘎的家鄉來，我依然非常興奮。我發了圖片給卓嘎，卓嘎說玉樹很大，她家在囊謙，離這裡很遠。',
      'Nvidia ',
    ]

    // Create translations (just append "translated" to each)
    const translations = expectedTexts.map((text) => `${text} (translated)`)

    const mockTranslator = jest.fn<MockTranslator>().mockResolvedValue({
      translations,
      model: 'google_gemini_2_5_flash_preview',
    })

    const result = await extractAndTranslateHtml(complexHtml, mockTranslator)

    // Should have called the translator with all texts
    expect(mockTranslator).toHaveBeenCalledWith(expectedTexts)

    // Verify the result contains translations
    const $ = cheerio.load(`<div>${result!.html}</div>`)
    expect($('div > p').eq(0).text()).toBe('')
    expect($('div > p').eq(1).text()).toBe(translations[0])
    expect($('div > blockquote p').eq(0).text()).toBe(translations[1])
    expect($('div > blockquote p').eq(1).text()).toBe(translations[2])
    expect($('div > p').eq(2).text().trim()).toBe(
      translations[3].trim() + translations[5].trim() + translations[4].trim()
    )
    expect($('div > pre code').text()).toBe(translations[6])
    expect($('div > figure.image figcaption').first().text()).toBe(
      translations[7]
    )
    expect($('div > p').eq(3).text()).toBe(translations[8])
    expect($('div > figure.embed-video figcaption').text()).toBe(
      translations[9]
    )
    // mention won't be translated
    expect($('div > p').eq(4).text()).toBe('Nvidia  (translated)@Syo。翔')
  })
})
