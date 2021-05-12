const chalk = require('chalk')
const createHTMLRenderer = require('./createHTMLRenderer')
const { createBundleRenderer } = require('./bundleRenderer')
const { error } = require('../utils/log')

const MAX_STATE_SIZE = 25000

module.exports = function createRenderFn ({
  htmlTemplate,
  clientManifestPath,
  serverBundlePath,
  shouldPrefetch,
  shouldPreload
}) {
  const bundle = require(serverBundlePath)
  const clientManifest = require(clientManifestPath)
  const renderContext = createBundleRenderer(bundle, {
    clientManifest,
    shouldPrefetch,
    shouldPreload
  })

  return async function renderPage(page, state, stateSize, hash) {
    const ssrContext = {
      path: page.path,
      location: page.location,
      state: createState(state),
      teleports: {}
    }

    let result

    try {
      result = await renderContext(ssrContext)
    } catch (err) {
      const location = page.location.name || page.location.path
      error(chalk.red(`Could not generate HTML for "${location}":`))
      throw err
    }

    const renderHTML = createHTMLRenderer(htmlTemplate, ssrContext.teleports)

    const gridsomeHash = `<meta name="gridsome:hash" content="${hash}">`
    const styles = result.renderStyles()
    const resourceHints = result.renderResourceHints()

    const head =
      '' +
      gridsomeHash +
      resourceHints +
      styles +
      (ssrContext.meta.head || '')

    const renderedState =
      state && stateSize <= MAX_STATE_SIZE
        ? result.renderState()
        : ''

    const scripts = '' +
      renderedState +
      result.renderScripts() +
      (ssrContext.meta.body || '')

    return renderHTML({
      app: (ssrContext.meta['body-prepend'] || '') + result.html,
      htmlAttrs: ssrContext.meta.htmlAttrs || '',
      headAttrs: ssrContext.meta.headAttrs || '',
      bodyAttrs: ssrContext.meta.bodyAttrs || '',
      head,
      hash: gridsomeHash,
      resourceHints,
      styles,
      scripts
    })
  }
}

function createState (state = {}) {
  return {
    data: state.data || null,
    context: state.context || {}
  }
}
