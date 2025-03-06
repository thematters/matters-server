import { environment } from 'common/environment.js'
import { mailService } from 'connectors/index.js'

test('send', async () => {
  await mailService.send({
    from: environment.emailFromAsk as string,
    // test templateId
    templateId: 'd-3f22ea8971c74b91bfe54348fce30208',
    personalizations: [
      {
        // https://temp-mail.org/en/
        to: 'nasabev728@dewareff.com',
        dynamicTemplateData: {
          subject: 'test-sendmail',
        },
      },
    ],
  })
})
