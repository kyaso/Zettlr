import { type SearchResult } from '@dts/common/search'

// Extracted from GlobalSearch.vue
export function markText (resultObject: SearchResult): string {
  const startTag = '<span class="search-result-highlight">'
  const endTag = '</span>'
  // We receive a result object and should return an HTML string containing
  // highlighting (we're using <strong>) where the result works. We have
  // access to restext, weight, line, and an array of from-to-ranges
  // indicating all matches on the given line. NOTE that all results are
  // being sorted correctly by the main process, so we can just assume the
  // results to be non-overlapping and from beginning to the end of the
  // line.
  let marked = resultObject.restext

  // "Why are you deep-cloning this array?" you may ask. Well, well. The
  // reason is that Vue will observe the original array. And, whenever an
  // observed thing -- be it an array or object -- is mutated, this will
  // cause Vue to update the whole component state. Array.prototype.reverse
  // actually mutates the array. So in order to prevent Vue from endlessly
  // updating the component, we'll pull out the values into an unobserved
  // cloned array that we can reverse without Vue getting stuck in an
  // infinite loop.
  const unobserved = resultObject.ranges.map(range => {
    return {
      from: range.from,
      to: range.to
    }
  })
  // Addendum Sun, 16 Jan 2022: If I had paid more attention to this little
  // curious fact here, I could've saved myself a lot of trouble with the
  // new Proxies of Vue3. For a short summary of my odyssee, see
  // https://www.hendrik-erz.de/post/death-by-proxy

  // Because it shifts positions, we need to insert the closing tag first
  for (const range of unobserved.reverse()) {
    marked = marked.substring(0, range.to) + endTag + marked.substring(range.to)
    marked = marked.substring(0, range.from) + startTag + marked.substring(range.from)
  }

  return marked
}
