import { environment } from 'common/environment'
import { mailService } from 'connectors'

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
