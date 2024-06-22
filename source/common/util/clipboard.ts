const config = window.config

/**
 * Copies the text as a ZKN link (if enabled in options).
 * If not enabled in options, then no double square brackets will be added.
 * @param text The text to copy
 */
export function copyZknLink (text: string): void {
  let copyText = text

  if (config.get('zkn.copyIDWithBrackets') === true) {
    copyText = '[[' + text + ']]'
  }

  navigator.clipboard.writeText(copyText).catch(err => console.error(err))
}
