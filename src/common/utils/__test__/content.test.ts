import {
  correctNestedBrTag,
  correctSelfClosingHtmlTag,
  countWords,
} from 'common/utils/index.js'

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
      data: '<p><em><s><u><br class="smart"><br class="smart" /></br></u></s></em></p>',
      toBe: '<p><em><s><u><br class="smart"><br class="smart"></u></s></em></p>',
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
      data: '<p><br class="smart"><br class="smart"><br class="smart" /></br></br></p>',
      toBe: '<p><br class="smart"><br class="smart"><br class="smart"></p>',
    },
    {
      data: '<p><u><br class="smart"><br class="smart"><br class="smart" /></br></br></u></p>',
      toBe: '<p><u><br class="smart"><br class="smart"><br class="smart"></u></p>',
    },
    {
      data: '<blockquote><br class="smart"><br class="smart"><br class="smart" /></br></br></blockquote>',
      toBe: '<blockquote><br class="smart"><br class="smart"><br class="smart"></blockquote>',
    },
    {
      data: '<blockquote><u><br class="smart"><br class="smart"><br class="smart" /></br></br></u></blockquote>',
      toBe: '<blockquote><u><br class="smart"><br class="smart"><br class="smart"></u></blockquote>',
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
      data: '<p><br class="smart">A<br class="smart">B<br class="smart" /></br></br></p>',
      toBe: '<p><br class="smart">A<br class="smart">B<br class="smart"></p>',
    },
    {
      data: '<p><u><br class="smart">A<br class="smart">B<br class="smart" /></br></br></u></p>',
      toBe: '<p><u><br class="smart">A<br class="smart">B<br class="smart"></u></p>',
    },
    {
      data: '<p><br class="smart">A is something... <br class="smart">B<br class="smart" /></br></br></p>',
      toBe: '<p><br class="smart">A is something... <br class="smart">B<br class="smart"></p>',
    },
    {
      data: '<p><u><br class="smart">A is something... <br class="smart">B<br class="smart" /></br></br></u></p>',
      toBe: '<p><u><br class="smart">A is something... <br class="smart">B<br class="smart"></u></p>',
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
      data: '<blockquote><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart" /></br></br></blockquote>',
      toBe: '<blockquote><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart"></blockquote>',
    },
    {
      data: '<blockquote><em><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart" /></br></br></em></blockquote>',
      toBe: '<blockquote><em><br class="smart">A is something.<br class="smart"><em>B</em>C<br class="smart"></em></blockquote>',
    },
    {
      data: '<p><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart" /></br></p>',
      toBe: '<p><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart"></p>',
    },
    {
      data: '<p><s><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart" /></br></s></p>',
      toBe: '<p><s><br class="smart">A is <a href="matters.news" target="_blank">here</a>.<br class="smart"></s></p>',
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
      data: '<p><a href="" target="_blank"><em><s><u>A<br class="smart"><br class="smart">o</u></s></em></a> B<br class="smart"></p>',
      toBe: '<p><a href="" target="_blank"><em><s><u>A<br class="smart"><br class="smart">o</u></s></em></a> B<br class="smart"></p>',
    },
  ]

  htmls.forEach(({ data, toBe }) => {
    expect(correctNestedBrTag()(data)).toBe(toBe)
  })
})

test('countWords', async () => {
  const contents = [
    {
      data: '3个字',
      count: 3,
    },
    {
      data: '  ',
      count: 0,
    },
    {
      data: ' со мной всю потёртый, с местами hello world отслоившейся краской ',
      count: 10,
    },
    {
      data: 'hello world. ',
      count: 2,
    },
    {
      data: 'Σε αγαπώ, όπως το φεγγάρι που κοιτάζει τη γη',
      count: 9,
    },
    {
      data: '출연: 최민식, 하정우, 조진웅, 마동석, hello world 곽도원, 김성균, 김혜은',
      count: 25,
    },
    {
      data: '私がタイに滞在したホテルは非常に費用対効果が高く、流行の間、それは通常よりほぼ30％安かった。 ',
      count: 42,
    },
    {
      data: '<p>Hello космонавты. Сегодня на орбите Crescent. Сразу скажу они вроде как ни чего еще не обещали за тестирование их платформы, но мы как криптаны поможем проверить устойчивость их платформы и заодно впишем свой кошелек, кто его знает.</p><figure class="image"><img src="https://assets.matters.news/embed/e3cf7301-0a94-49de-92dd-7785b6d3f0c2.jpeg" data-asset-id="e3cf7301-0a94-49de-92dd-7785b6d3f0c2"><figcaption><span>Полумесяц</span></figcaption></figure><p>Crescent предоставит подключенную функциональность DeFi для экосистемы Cosmos, чтобы повысить эффективность использования капитала и эффективно управлять рисками. Он фокусируется на трех основных функциях; сrescent DEX, повышение crescent, производные crescent.</p><p>Не буду подробно останавливаться на этом а перейду сразу к описанию тестнета, думаю и так все понятно, но если у вас есть желание и время почитать то вот вам <a href="https://docs.crescent.network/introduction/what-is-crescent" rel="noopener noreferrer" target="_blank">ссылка</a> где подробно все указано.</p><p>Для начала переходим по <a href="https://testnet.crescent.network/swap" rel="noopener noreferrer" target="_blank">ссылке</a> на саму платформу.</p><figure class="image"><img src="https://assets.matters.news/embed/e9cddfcb-5ff5-4817-8c23-c4d1f2a7ebbc.jpeg" data-asset-id="e9cddfcb-5ff5-4817-8c23-c4d1f2a7ebbc"><figcaption><span>Connect Wallet</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/8cb1f7db-81cc-40c1-9e53-c9803b302068.jpeg" data-asset-id="8cb1f7db-81cc-40c1-9e53-c9803b302068"><figcaption><span>Подтверждаем для добавления всех тестовый сетей.</span></figcaption></figure><p>После подключаем кошелек Keplr и подписываем разрешения добавления тестовых сетей (<strong>bombay-12, cosmoshub-testnet, mooncat-1-1</strong>) </p><figure class="image"><img src="https://assets.matters.news/embed/bb300996-75e5-4ecb-9b97-ee5156cf70c9.jpeg" data-asset-id="bb300996-75e5-4ecb-9b97-ee5156cf70c9"><figcaption><span>Faucet</span></figcaption></figure><p>Переходим в верхнем правом углу в Faucet и берем с крана тестовых токенов.</p><figure class="image"><img src="https://assets.matters.news/embed/4b727ac3-a2b5-47cd-8e2a-22aa2bd7334a.jpeg" data-asset-id="4b727ac3-a2b5-47cd-8e2a-22aa2bd7334a"><figcaption><span>Terra Faucet</span></figcaption></figure><p>Хочу сразу сказать что вам придется скорее всего подождать чтобы получить монеты CRE самой площадки и монет ATOM. Я получил свои токены CRE только через день грубо говоря, поэтому придется скорее подождать чтобы оплатить те же транзакции в токенах CRE. Можете сегодня например пару раз потыкать для получения тестовых токенов и после того как придут уже делать дальнейшие действия.</p><figure class="image"><img src="https://assets.matters.news/embed/1135f60b-9709-40d9-ac04-7cbe1ccad211.jpeg" data-asset-id="1135f60b-9709-40d9-ac04-7cbe1ccad211"><figcaption><span>Переходим в Portfolio и перекидываем свои токены LUNA из сети bombay-12  в сеть mooncat1-1</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/c516d0bf-5196-4139-897c-fa4c12fcebf4.jpeg" data-asset-id="c516d0bf-5196-4139-897c-fa4c12fcebf4"><figcaption><span>Deposit</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/2a9fb78f-2555-4f78-98c3-0289481ae079.jpeg" data-asset-id="2a9fb78f-2555-4f78-98c3-0289481ae079"><figcaption><span>Проверяем баланс </span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/73363b49-8bed-4ab1-bfa7-8ee0982eea58.jpeg" data-asset-id="73363b49-8bed-4ab1-bfa7-8ee0982eea58"><figcaption><span>Переходим в раздел Farm</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/42c2830c-a7a6-43b3-a3d5-31bc9c8c4763.jpeg" data-asset-id="42c2830c-a7a6-43b3-a3d5-31bc9c8c4763"><figcaption><span>Добавляем ликвидность в LP токенах cCRE-CRE</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/64d66c04-4a75-452a-89ce-d61438ee4f0a.jpeg" data-asset-id="64d66c04-4a75-452a-89ce-d61438ee4f0a"><figcaption><span>Пишем сколько хотим добавить и затем DEPOSIT</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/297f1696-1b56-49f6-9a91-32273997adb8.jpeg" data-asset-id="297f1696-1b56-49f6-9a91-32273997adb8"><figcaption><span>Тут можем наблюдать такой знак, это означает что наши токены не работают. Нажимаем на Manage</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/43b1261f-fde6-4698-b389-3a08e98090ba.jpeg" data-asset-id="43b1261f-fde6-4698-b389-3a08e98090ba"><figcaption><span>Нажимаем в появившемся окне Farm, далее сколько процентов хотим внести и Farm. Подтверждаем на кошельке</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/f1d01b7f-9bf4-4f9c-8435-ffd502e9aa9b.jpeg" data-asset-id="f1d01b7f-9bf4-4f9c-8435-ffd502e9aa9b"><figcaption><span>Все наши монеты работают. </span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/e273d32c-87f8-46a6-8431-dab0550f4389.jpeg" data-asset-id="e273d32c-87f8-46a6-8431-dab0550f4389"><figcaption><span>Переходим в раздел Staking, пишем сколько монет CRE хотим застейкать и нажимаем на STAKE, подтверждаем на кошельке. Вместо застейканных CRE нам дают монет bCRE </span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/ba3b3b10-5ab2-4cc4-8aec-5465ab85d8ee.jpeg" data-asset-id="ba3b3b10-5ab2-4cc4-8aec-5465ab85d8ee"><figcaption><span>Можем полученные от стейкинга монеты bCRE застейкать к паре LUNA-bCRE</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/d959ae01-cea6-4144-8ee8-476c95bb9d26.jpeg" data-asset-id="d959ae01-cea6-4144-8ee8-476c95bb9d26"><figcaption><span>Deposit, сумма обеих монет и нажимаем на DEPOSIT</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/8f947fe3-f39b-43a1-aa03-9b7b49057501.jpeg" data-asset-id="8f947fe3-f39b-43a1-aa03-9b7b49057501"><figcaption><span>Тут опять же чтобы наши монеты начали работать нажимаем на Manage и проделываем выше перечисленные действия.</span></figcaption></figure><figure class="image"><img src="https://assets.matters.news/embed/e89946f5-1f69-4434-9af8-8d73a940e0c6.jpeg" data-asset-id="e89946f5-1f69-4434-9af8-8d73a940e0c6"><figcaption><span>Все наши вложения работают.</span></figcaption></figure><p>На этом пока все, платформа протестирована, токены работают а дадут ли нам что нибудь за эти простые действия решать команде но пальчики протестировать и привязать лишний раз кошелек не помешало.</p><p>Всем мира!</p>',
      count: 376,
    },
  ]

  contents.forEach(({ data, count }) => {
    expect(countWords(data)).toBe(count)
  })
})
