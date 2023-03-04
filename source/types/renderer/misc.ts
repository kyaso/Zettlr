export interface RelatedFile {
  file: string
  path: string
  tags: string[]
  link: 'inbound'|'outbound'|'bidirectional'|'none'
}

export interface OutboundLink {
  link: string // The link text
  targetFilePath: string | undefined // The target file in case the link points to a file
  files: string[] // List of files that have that link
  hideFileSet: Boolean // Whether to hide in sidebar
}
