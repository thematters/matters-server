import { promises as fs } from 'fs'
import 'module-alias/register'
import request from 'request-promise-native'

import { environment, isDev } from 'common/environment'

/*
 * prepare http request options for sendgrid web API
 */
const getOptions = (method: string, path: string, body = {}) => {
  const uri = `https://api.sendgrid.com/v3/${path}`
  const options = {
    method,
    uri,
    headers: {
      authorization: `Bearer ${environment.sgKey}`,
      'content-type': 'application/json'
    },
    body,
    json: true
  }

  return options
}

/**
 * get a list of version IDs for a dynamic template
 */
const getTemplateVersions = async (templateId: string) => {
  const options = getOptions('GET', `templates/${templateId}`)
  const result = await request(options)
  const v: string[] = []
  for (const version of result.versions) {
    v.push(version.id)
  }
  console.log(v)
  return v
}

/**
 * remove all versions of a template except the latest one
 */
const deleteTemplateVersions = async (templateId: string) => {
  const versions = await getTemplateVersions(templateId)
  for (const v of versions.slice(1)) {
    const options = getOptions(
      'DELETE',
      `templates/${templateId}/versions/${v}`
    )
    await request(options)
    return
  }
}

/**
 * upload a new dynamic template version to sendgrid
 */
const createTemplateVersion = async (
  templateId: string,
  name: string,
  file: string
) => {
  try {
    // remove older versions first
    const tplData = await fs.readFile(file)
    const template = Buffer.from(tplData).toString()
    await deleteTemplateVersions(templateId)
    const body = {
      template_id: templateId,
      active: 1,
      name,
      html_content: template
    }
    const options = getOptions('POST', `templates/${templateId}/versions`, body)
    const result = await request(options)
    console.log(result)
  } catch (err) {
    console.log(`Error occurs: ${err}`)
    process.exit(1)
  }
}

/*=======================*/
// invoke here
const TEMPLATE_ROOT = 'src/connectors/mail/templates/build/'
const TEMPLATES = [
  {
    templateId: 'd-805ccf4182244f59a5388b581df1eeab',
    name: 'Daily Summary',
    templateFile: 'dailySummay.html'
  },
  {
    templateId: 'd-b370a6eddc394814959b49db1ba4cfec',
    name: 'User Deleted',
    templateFile: 'userDeleted.html'
  }
]
;(async () => {
  for (const t of TEMPLATES) {
    createTemplateVersion(
      t.templateId,
      t.name,
      `${TEMPLATE_ROOT}${t.templateFile}`
    )
  }
})()
