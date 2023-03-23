import { sanitize } from 'common/utils/index.js'

test('valid contents', async () => {
  const htmls = [
    // link:mention
    {
      content:
        '<a class="mention" href="/@hi176" rel="noopener noreferrer" target="_blank" data-display-name="Matty" data-user-name="hi176" data-id="VXNlcjoxNDk0OQ"><span>@Matty</span></a>',
    },
    // link:embed
    {
      content:
        '<p>建築師是指積極參與馬特市建設的市民，在今年2月份選出了第一批共21名建築師，具體名單請見<a href="https://matters.news/@hi176/%E7%AC%AC%E4%B8%80%E5%B1%86%E9%A6%AC%E7%89%B9%E5%B8%82%E5%BB%BA%E7%AF%89%E5%B8%AB%E5%90%8D%E5%96%AE%E5%85%AC%E5%B8%83-%E5%85%B1%E5%90%8C%E6%91%B9%E7%95%AB%E7%A4%BE%E5%8D%80%E7%9A%84%E6%9C%AA%E4%BE%86%E8%97%8D%E5%9C%96-bafyreiehfgzomr5spnuqfwnoog7ubfhr7nw3i7jfqfqymolb5p42evwvxy" target="_blank">這裡</a>。建築師勳章是「板斧」的形狀，謝謝為馬特市添磚加瓦的建築師們。</p>',
    },
    // figure:image
    {
      content:
        '<figure class="image"><img src="https://assets.matters.news/embed/4fc9e271-115a-4e6c-8e50-f2b7adcc5e00.png" data-asset-id="4fc9e271-115a-4e6c-8e50-f2b7adcc5e00"><figcaption><span></span></figcaption></figure>',
    },
    // figure:audio
    {
      content:
        '<figure class="audio"><audio controls data-file-name="銜接兩個金融世界的橋樑" preload="metadata"><source src="https://assets.matters.news/embedaudio/6d44be13-1e15-4649-9f43-b6a220fe5aa4.mpga" type="audio/mpeg" data-asset-id="6d44be13-1e15-4649-9f43-b6a220fe5aa4"></audio><div class="player"><header><div class="meta"><h4 class="title"><div>銜接兩個金融世界的橋樑</div></h4><div class="time"><span class="current" data-time="00:00"></span><span class="duration" data-time="49:30"></span></div></div><span class="play"></span></header><footer><div class="progress-bar"><span></span></div></footer></div><figcaption>',
    },
    // iframe:YouTube
    {
      content:
        '<figure class="embed-video"><div class="iframe-container"><iframe src="https://www.youtube.com/embed/sQIhDW2cWIo?rel=0" frameborder="0" allowfullscreen="true" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div><figcaption>',
    },
    // iframe:LikeButton
    {
      content:
        '<iframe src="https://button.like.co/in/embed/astrohsu99/button" frameborder="0" allowfullscreen="false" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"></iframe>',
    },
    // iframe:JSFiddle
    {
      content:
        '<figure class="embed-code"><div class="iframe-container"><iframe src="https://jsfiddle.net/yokev33205/efcd46mb/embedded/" frameborder="0" allowfullscreen="false" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div><figcaption><span></span></figcaption></figure>',
    },
    {
      content:
        '<pre class="ql-syntax" spellcheck="false">Pre1\n</pre><p>Para2</p><p>Para3</p>',
    },
  ]

  htmls.forEach(({ content }) => {
    expect(sanitize(content)).toBe(content)
  })
})

test('invalid contents', async () => {
  const htmls = [
    // img:src
    {
      content:
        '<figure class="image"><img src="https://assets.matters.news/processed/1080w/embed/test style=animation-name:spinning onanimationstart=console.log(1337)" data-asset-id="5d29c54b-9dd1-4256-9fe2-16a4b4148dc3"><figcaption>',
      toMatch: /^((?!test\sstyle).)*$/,
    },
    {
      content: '<img src=`javascript:alert("RSnake says, \'XSS\'")`>',
      toMatch: '',
    },
    {
      content: '<img """><SCRIPT>alert("XSS")</SCRIPT>">',
      toMatch: '<img>&lt;SCRIPT&gt;alert("XSS")&lt;/SCRIPT&gt;"&gt;',
    },

    // iframe:src
    {
      content:
        '<iframe sandbox="allow-scripts allow-same-origin" src=example.com></iframe>',
      toMatch: '<iframe sandbox="allow-scripts allow-same-origin"></iframe>',
    },
    // iframe:sandbox
    {
      content:
        '<iframe sandbox="allow-top-navigation allow-scripts allow-same-origin" src=https://www.youtube.com/embed/sQIhDW2cWIo?rel=0></iframe>',
      toMatch:
        '<iframe sandbox="allow-scripts allow-same-origin" src="https://www.youtube.com/embed/sQIhDW2cWIo?rel=0"></iframe>',
    },

    // link:href
    {
      content: '<link rel="stylesheet" href="javascript:alert(\'XSS\');">',
      toMatch: '',
    },

    // others
    {
      content: '<svg onload=alert(1)>',
      toMatch: '',
    },
    {
      content: '<img/src/onerror=alert(1)>',
      toMatch: '',
    },
  ]

  htmls.forEach(({ content, toMatch }) => {
    expect(sanitize(content)).toMatch(toMatch)
  })
})
