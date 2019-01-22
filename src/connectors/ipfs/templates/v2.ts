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
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const style = /*html*/ `

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
  hr {
    height: 1px;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 600;
    line-height: 1.4;
  }
  h1 {
    font-size: 28px;
  }
  h2 {
    font-size: 24px;
  }
  h3 {
    font-size: 22px;
  }
  h4 {
    font-size: 18px;
  }
  h5 {
    font-size: 16px;
  }
  h6 {
    font-size: 14px;
  }
  a {
    color: #9f8144;
    border-bottom: 1px solid currentcolor;
    text-decoration: none;
    padding-bottom: 2px;
  }

  header figure.byline {
    margin: 0;
  }
  header figure.byline * + * {
    padding-left: 10px;
  }
  header figure.byline time {
    color: #b3b3b3;
  }

  article > * {
    margin-top: 32px;
    margin-bottom: 32px;
  }
  article li ul,
  article li ol {
    margin: 0 20px;
  }
  article li {
    margin: 20px 0;
  }
  article ul {
    list-style-type: disc;
  }
  article ol {
    list-style-type: decimal;
  }
  article ol ol {
    list-style: upper-alpha;
  }
  article ol ol ol {
    list-style: lower-roman;
  }
  article ol ol ol ol {
    list-style: lower-alpha;
  }
  article img, article video, article audio {
    display: block;
    max-width: 100%;
    margin: 0 auto;
  }
  article blockquote {
    margin-left: 20px;
    margin-right: 20px;
    color: #9f8144;
  }
  article p {
    line-height: 2;
  }
  .title {
    font-size: 32px;
  }
  figure.summary {

  }
  figure.embed {

  }
  figure.image figcaption {
    font-size: 16px;
    color: #b3b3b3;
  }
</style>

`

const template = ({
  title,
  author,
  summary,
  content,
  publishedAt
}: TemplateVars) => /*html*/ `

<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${summary}">
    <meta property="article:author" content="${author.userName} (@${
  author.displayName
})">
    ${style}
  </head>
  <body>
    <main>
      <header>
        <h1 class="title">${title}</h1>
        <figure class="byline">
          <a ref="author">${author.userName} (@${author.displayName})</a>
          <time datetime="${publishedAt}">${toDateString(publishedAt)}</time>
        </figure>
      </header>
      <article>
        ${content}
      </article>
    </main>
  </body>
</html>

`

export default template
