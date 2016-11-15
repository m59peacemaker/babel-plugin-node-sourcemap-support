const path = require('path')
const {execSync} = require('child_process')
const {readFileSync, outputFileSync} = require('fs-extra')
const {parse} = require('babylon')
const supportFile = readFileSync(path.join(__dirname, 'support-bundle.js'), 'utf8')

const getAbsolute = (filename) => {
  if (path.isAbsolute(filename)) {
    return filename
  }
  return path.join(process.cwd(), filename)
}

const defaults = {
  src: './src',
  dest: './build',
  entries: ['index.js'],
  supportModulePath: '_build_modules/source-map-support-register.js'
}

const plugin = () => {
  const copiedTo = []
  return {
    visitor: {
      Program: ({node}, state) => {
        const opts = Object.assign({}, defaults, state.opts)
        const supportModulePath = opts.supportModulePath || defaultSupportModulePath
        const src = getAbsolute(opts.src)
        const dest = getAbsolute(opts.dest)
        const entries = opts.entries.map(e => path.join(src, e))
        const absFilename = getAbsolute(state.file.opts.filename)
        if (!entries.includes(absFilename)) {
          return
        }
        const pathToDestSupport = path.join(dest, opts.supportModulePath)
        const pathToSrcSupport = path.join(src, opts.supportModulePath)
        const pathFromFileToSupport = './' + path.relative(path.dirname(absFilename), pathToSrcSupport)
        if (opts.cache === false || !copiedTo.includes(dest)) {
          copiedTo.push(dest)
          outputFileSync(pathToDestSupport, supportFile)
        }
        const requireCode = parse(`require('${pathFromFileToSupport}')`).program.body[0]
        requireCode._blockHoist = true
        node.body.unshift(requireCode)
      }
    }
  }
}

module.exports = plugin
