export const postsQuery = `
query UserStreamOverview($userId: ID!, $pagingOptions: PagingOptions) {
  user(id: $userId) {
    id
    profileStreamConnection(paging: $pagingOptions) {
      ...commonStreamConnection
      __typename
    }
    navItems {
      title
      __typename
    }
    __typename
  }
}

fragment commonStreamConnection on StreamConnection {
  stream {
    ...StreamItemList_streamItem
    __typename
  }
  pagingInfo {
    next {
      limit
      page
      source
      to
      ignoredIds
      __typename
    }
    __typename
  }
  __typename
}

fragment StreamItemList_streamItem on StreamItem {
  ...StreamItem_streamItem
  __typename
}

fragment StreamItem_streamItem on StreamItem {
  itemType {
    ... on StreamItemPostPreview {
      ...StreamItemPostPreview_streamItemPostPreview
      __typename
    }
  }
  __typename
}

fragment StreamItemPostPreview_streamItemPostPreview on StreamItemPostPreview {
  post {
    id
    __typename
  }
  __typename
}
`

export const postQuery = `
query InteractivePostBodyQuery($postId: ID!, $showHighlights: Boolean!, $showNotes: Boolean!) {
  post(id: $postId) {
    id
    title
    content {
      bodyModel {
        paragraphs {
          ...PostBodySection_paragraphs
        }
      }
    }
    highlights @include(if: $showHighlights) {
      id
      __typename
    }
    privateNotes @include(if: $showNotes) {
      id
      __typename
    }
    __typename
  }
}

fragment PostBodySection_paragraphs on Paragraph {
  ...PostBodyParagraph_paragraph
  __typename
}

fragment PostBodyParagraph_paragraph on Paragraph {
  type
  ...ImageParagraph_paragraph
  ...TextParagraph_paragraph
  ...IframeParagraph_paragraph
  ...MixtapeParagraph_paragraph
  __typename
}

fragment IframeParagraph_paragraph on Paragraph {
  iframe {
    mediaResource {
      id
      iframeSrc
      iframeHeight
      iframeWidth
      title
      __typename
    }
    __typename
  }
  __typename
}

fragment ImageParagraph_paragraph on Paragraph {
  href
  metadata {
    id
    originalHeight
    originalWidth
    focusPercentX
    focusPercentY
    alt
    __typename
  }
  __typename
}

fragment TextParagraph_paragraph on Paragraph {
  text
  __typename
}

fragment MixtapeParagraph_paragraph on Paragraph {
  text
  mixtapeMetadata {
    href
    __typename
  }
  __typename
}
`
