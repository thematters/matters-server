import {
  extractAndReplaceUrls,
  restoreUrlPlaceholders,
} from '../translation.js'

describe('Translation utilities', () => {
  describe('extractAndReplaceUrls and restoreUrlPlaceholders', () => {
    it('should handle complex HTML with multiple element types', () => {
      const googleDocUrl =
        'https://docs.google.com/document/d/16pm9LqoQlId8qsUmvC1iEHE8QSdWrBWt2bLJazbX8Ys/edit?tab=t.0'
      const imageUrl =
        'https://imagedelivery.net/kDRCweMmqLnTPNlbum-pYA/non-prod/embed/94a5b539-8323-44d5-beee-91784341def1.jpeg/public'
      const youtubeUrl = 'https://www.youtube.com/embed/?rel=0'
      const mentionUrl = '/@yihanhuangmo'

      const html = `
      <p><br class="smart" /></p>
      <p>內容：一張海報，它的简化率只有4.5%，比另一道地狱级数独"Escargot"的5.0%还低，也就是说，几乎没有"简单的第一步"</p>
      <blockquote>
          <p>內容：基於之前討論過的方式與我們提供了的兩組文本</p>
          <p>日期：本周出草圖，推進討論</p>
      </blockquote>
      <p>
          下方：要放得下金句（已選金句<a target="_blank" rel="noopener noreferrer nofollow" href="${googleDocUrl}"><strong>這裡</strong></a>，在 page 4）
      </p>
      <pre><code>欣然 一目, [29/4/2025 01:42]我草</code></pre>
      <figure class="image">
          <img src="${imageUrl}" />
          <figcaption>它的简化率只有4.5%，比另一道地狱级数独"Escargot"的5.0%还低，也就是说，几乎没有"简单的第一步"</figcaption>
      </figure>
      <p>對於這次旅行我唯一期待的就是吃——我大概知道旅行的內容是什麼樣的，與其說去考察，不如說就是拍攝那些在新聞敘述中常被描繪為「新西藏建設成果」的地方，把宣傳成果帶回去，發布之後，玉樹開心了，我們本地的媒體也開心了，雙贏，其他大多是無聊的活動。</p>
      <figure class="embed embed-video" data-provider="youtube">
          <div class="iframe-container"><iframe src="${youtubeUrl}" loading="lazy" allowfullscreen frameborder="0"></iframe></div>
          <figcaption>飛機降落在玉樹巴塘機場時，窗外是寂靜的草色的原野與遠處的雪山，很漂亮。十月，風吹過來的時候讓穿棉衣的我都打了個哆嗦，因為是第一次到卓嘎的家鄉來，我依然非常興奮。我發了圖片給卓嘎，卓嘎說玉樹很大，她家在囊謙，離這裡很遠。</figcaption>
      </figure>
      <p>Nvidia <a class="mention" href="${mentionUrl}" data-id="VXNlcjozNTQ0" data-user-name="yihanhuangmo" data-display-name="Syo。翔" rel="noopener noreferrer nofollow"><span>@Syo。翔</span></a></p><p><br class="smart"></p>
    `
      const { html: processedHtml, urlMap } = extractAndReplaceUrls(html)

      expect(processedHtml.includes(googleDocUrl)).toBe(false)
      expect(processedHtml.includes(imageUrl)).toBe(false)
      expect(processedHtml.includes(youtubeUrl)).toBe(false)
      expect(processedHtml.includes(mentionUrl)).toBe(false)

      expect(processedHtml.includes('URL0')).toBe(true)
      expect(processedHtml.includes('URL1')).toBe(true)
      expect(processedHtml.includes('URL2')).toBe(true)
      expect(processedHtml.includes('URL3')).toBe(true)

      expect(urlMap.get('URL0')).toBe(googleDocUrl)
      expect(urlMap.get('URL1')).toBe(imageUrl)
      expect(urlMap.get('URL2')).toBe(youtubeUrl)
      expect(urlMap.get('URL3')).toBe(mentionUrl)

      expect(urlMap.size).toBe(4)

      // Test restoration of URLs
      const restoredHtml = restoreUrlPlaceholders(processedHtml, urlMap)
      expect(restoredHtml).toBe(html)
    })
  })
})
