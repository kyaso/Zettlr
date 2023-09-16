/**
 * Extracts any Zkn link which is contained in a heading.
 * Unfortunately, Codemirror ATX heading parsing ignores those, so we have
 * to do it manually using this function.
 *
 * @param   {string}  markdown   The full contents of the file
 *
 * @return  {string[]}           A list of found Zkn links
 */
export default function extractZknLinksInHeadings (
  markdown: string
): string[] {
  const headingLines: string[] = []
  const headingRegex = /#+\s+.*\n/g
  const zknLinkRegex = /\[\[(.*?)\]\]/g
  let match
  const zknLinkMatches = []

  // First, get all heading lines
  while ((match = headingRegex.exec(markdown)) !== null) {
    headingLines.push(match[0])
  }

  // For each heading line, extract all link matches (if any)
  for (const line of headingLines) {
    zknLinkMatches.push([...line.matchAll(zknLinkRegex)])
  }

  // Extract and return the Zkn links from the match objects
  // (ChatGPT came up with this magic)
  const zknLinks = zknLinkMatches.flatMap(matchGroup =>
    matchGroup.map(match => match[1])
  )

  // console.log('matches: ', matches)
  // console.log('wikilinks: ', wikilinks)
  return zknLinks
}
