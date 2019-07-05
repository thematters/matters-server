import { UTM_PARAMETER } from 'common/enums'
import { environment } from 'common/environment'

const { siteDomain } = environment

type TemplateVars = {
  title: string
  author: {
    userName: string
    displayName: string
  }
  summary: string
  content: string
  publishedAt: Date
}

const toDateString = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const style =
  // prettier-ignore
  /*html*/ `

<style>
  html, body {
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    font-size: 18px;
    line-height: 1.5;
  }
  main {
    max-width: 673px;
    margin: 40px auto;
    padding: 0 20px;
  }
  hr { height: 1px; }
  h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.4; }
  h1 { font-size: 28px; }
  h2 { font-size: 24px; }
  h3 { font-size: 22px; }
  h4 { font-size: 18px; }
  h5 { font-size: 16px; }
  h6 { font-size: 14px; }
  li ul, li ol { margin: 0 20px; }
  li { margin: 20px 0; }
  ul { list-style-type: disc; }
  ol { list-style-type: decimal; }
  ol ol { list-style: upper-alpha; }
  ol ol ol { list-style: lower-roman; }
  ol ol ol ol { list-style: lower-alpha; }
  img, video, audio {
    display: block;
    max-width: 100%;
    margin: 0 auto;
  }
  audio {
    width: 100%;
  }
  blockquote {
    margin-left: 20px;
    margin-right: 20px;
    color: #5F5F5F;
  }

  header {
    margin-bottom: 40px;
  }
  header h1 {
    font-size: 32px;
  }
  header figure.byline {
    font-size: 16px;
    margin: 0;
  }
  header figure.byline * + * {
    padding-left: 10px;
  }
  header figure.byline time {
    color: #b3b3b3;
  }
  header figure.byline [ref="source"]::before {
    content: '';
    border-left: 1px solid currentColor;
    padding-left: 10px;
  }

  article > * {
    margin-top: 20px;
    margin-bottom: 24px;
  }
  article a {
    border-bottom: 1px solid currentcolor;
    text-decoration: none;
    padding-bottom: 2px;
  }
  article p {
    line-height: 1.8;
  }
  figure figcaption {
    margin-top: 5px;
    font-size: 16px;
    color: #b3b3b3;
  }

  figure .iframe-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-top: 56.25%;
  }
  figure .iframe-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>

`

const template = ({
  title,
  author,
  summary,
  content,
  publishedAt
}: TemplateVars) =>
  // prettier-ignore
  /*html*/ `

<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${summary}">
    <meta property="og:title" content="${author.displayName}: ${title}">
    <meta property="og:description" content="${summary}">
    <meta property="article:author" content="${author.displayName} (@${author.userName})">
    <meta name="twitter:title" content="${author.displayName}: ${title}">
    <meta name="twitter:description" content="${summary}">
    ${style}
  </head>
  <body itemscope itemtype="http://schema.org/Article">
    <main>
      <header>
        <h1 itemprop="headline">${title}</h1>
        <figure class="byline">
          <a href="${siteDomain}/@${author.userName}?${UTM_PARAMETER.SOURCE.IPFS}" target="_blank" itemprop="author">
            ${author.displayName} (@${author.userName})
          </a>
          <time itemprop="datePublished" datetime="${publishedAt.toISOString()}">${toDateString(publishedAt)}</time>
          <span itemprops="provider" itemscope itemtype="http://schema.org/Organization">
            from <span itemprops="name">Matters</span>
            <meta itemprops="url" content="https://matters.news">
          </span>
        </figure>
      </header>
      <article itemprop="articleBody">
        ${content}
      </article>
    </main>
  </body>
</html>

`

export default template
