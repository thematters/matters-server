export default /* GraphQL */ `

  extend type Mutation {
    singleFileDelete(input: SingleFileDeleteInput): Boolean
    singleFileUpload(input: SingleFileUploadInput): File!
  }

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    path: String!
  }

  input SingleFileDeleteInput {
    path: String!
  }

  input SingleFileUploadInput {
    purpose: String
    file: Upload!
  }

`
