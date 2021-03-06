const { shell, ipcRenderer } = require('electron')
const makeValidUri = require('../../util/make-valid-uri')
const { trans } = require('../../i18n')
const path = require('path')

const VALID_FILETYPES = require('../../data.json').filetypes

/**
 * Resolves and opens a link safely (= not inside Zettlr, except it's a local MD file)
 *
 * @param   {String}      url  The URL to open
 * @param   {CodeMirror}  cm   The instance to use if it's a heading link
 */
module.exports = function (url, cm) {
  if (url[0] === '#') {
    // We should open an internal link
    let re = new RegExp('#\\s[^\\r\\n]*?' +
    url.replace(/-/g, '[^\\r\\n]+?').replace(/^#/, ''), 'i')
    // The new regex should now match the corresponding heading in the document
    for (let i = 0; i < cm.lineCount(); i++) {
      let line = cm.getLine(i)
      if (re.test(line)) {
        cm.setCursor({ 'line': i, 'ch': 0 })
        cm.refresh()
        break
      }
    }
  } else {
    // It is valid Markdown to surround the URL with < and >
    url = url.replace(/^<(.+)>$/, '$1') // Looks like an Emoji!
    // We'll be making use of a helper function here, because
    // we cannot rely on the errors thrown by new URL(), as,
    // e.g., file://./relative.md will not throw an error albeit
    // we need to convert it to absolute.
    let base = cm.getOption('zettlr').markdownImageBasePath
    let validURI = makeValidUri(url, base)

    // Now we have a valid link. Finally, let's check if we can open the file
    // internally, without having to switch to an external program.
    const localPath = validURI.replace('file://', '')
    const isValidFile = VALID_FILETYPES.includes(path.extname(localPath))
    const isLocalMdFile = path.isAbsolute(localPath) && isValidFile

    if (isLocalMdFile) {
      // Attempt to open internally
      ipcRenderer.invoke('application', {
        command: 'open-file',
        payload: {
          path: this.obj.path,
          newTab: false
        }
      })
        .catch(e => console.error(e))
    } else {
      shell.openExternal(validURI).catch((err) => {
        // Notify the user that we couldn't open the URL
        if (err) {
          global.notify(trans('system.error.open_url_error', validURI) + ': ' + err.message)
        }
      })
    }
  }
}
