const test = require('tape')
const path = require('path')
const {exec, execSync} = require('child_process')
const fs = require('fs-extra')

const tmpDir = path.join(__dirname, '../', 'tmp')
const tmpPath = (...args) => path.join(tmpDir, ...args)
const reset = () => fs.removeSync(tmpDir)
const babelPath = require.resolve('babel-cli/bin/babel')

test('explicit opts', t => {
  t.plan(1)
  const src = 'path/to/src'
  const dest = 'path/to/out/dir'
  const entry = `const x = () => { throw new Error('123') }
    x()`
  const rc = {
    presets: ["es2015"],
    plugins: [
      ['../index.js', {
        src,
        dest,
        entries: ['app.js']
      }]
    ]
  }
  fs.outputFileSync(tmpPath(src, 'app.js'), entry)
  fs.outputFileSync(tmpPath('.babelrc'), JSON.stringify(rc))
  execSync(`${babelPath} ${src} -d ${dest} --source-maps inline`, {cwd: tmpDir})
  exec(`node ${tmpPath(dest, 'app')}`, (err, stdout, stderr) => {
    reset()
    const line = stderr.split('\n')[1]
    t.true(line.includes(src + '/app.js:1'), line)
  })
})

test('default opts', t => {
  t.plan(1)
  const entry = `const x = () => { throw new Error('123') }
    x()`
  const rc = {
    presets: ["es2015"],
    plugins: [
      ['../index.js']
    ]
  }
  fs.outputFileSync(tmpPath('src/index.js'), entry)
  fs.outputFileSync(tmpPath('.babelrc'), JSON.stringify(rc))
  execSync(`${babelPath} src -d build --source-maps inline`, {cwd: tmpDir})
  exec(`node ${tmpPath('build')}`, (err, stdout, stderr) => {
    reset()
    const line = stderr.split('\n')[1]
    t.true(line.includes('src/index.js:1'), line)
  })
})

test('external sourcemaps', t => {
  t.plan(1)
  const entry = `const x = () => { throw new Error('123') }
    x()`
  const rc = {
    presets: ["es2015"],
    plugins: [
      ['../index.js']
    ]
  }
  fs.outputFileSync(tmpPath('src/index.js'), entry)
  fs.outputFileSync(tmpPath('.babelrc'), JSON.stringify(rc))
  execSync(`${babelPath} src -d build --source-maps`, {cwd: tmpDir})
  exec(`node ${tmpPath('build')}`, (err, stdout, stderr) => {
    reset()
    const line = stderr.split('\n')[1]
    t.true(line.includes('src/index.js:1'), line)
  })
})

test('multiple errors', t => {
  t.plan(2)
  const entry = `const x = () => { throw new Error('123') }
    function y () {
      throw new Error('456')
    }
    try {
      x()
    } catch (err) {
      console.log(err)
      y()
    }`
  const rc = {
    presets: ["es2015"],
    plugins: [
      ['../index.js']
    ]
  }
  fs.outputFileSync(tmpPath('src/index.js'), entry)
  fs.outputFileSync(tmpPath('.babelrc'), JSON.stringify(rc))
  execSync(`${babelPath} src -d build --source-maps inline`, {cwd: tmpDir})
  exec(`node ${tmpPath('build')}`, (err, stdout, stderr) => {
    reset()
    {
      const line = stdout.split('\n')[1]
      t.true(line.includes('src/index.js:1'), line)
    }
    {
      const line = stderr.split('\n')[1]
      reset()
      t.true(line.includes('src/index.js:3'), line)
    }
  })
})

test('option - supportModulePath', t => {
  t.plan(2)
  const entry = `const x = () => { throw new Error('123') }
    x()`
  const rc = {
    presets: ["es2015"],
    plugins: [
      ['../index.js', {
        supportModulePath: 'here'
      }]
    ]
  }
  fs.outputFileSync(tmpPath('src/index.js'), entry)
  fs.outputFileSync(tmpPath('.babelrc'), JSON.stringify(rc))
  execSync(`${babelPath} src -d build --source-maps inline`, {cwd: tmpDir})
  exec(`node ${tmpPath('build')}`, (err, stdout, stderr) => {
    t.true(fs.statSync(tmpPath('build/here')).isFile())
    reset()
    const line = stderr.split('\n')[1]
    t.true(line.includes('src/index.js:1'), line)
  })
})

test('multiple entries', t => {
  t.plan(2)
  const entry = `const x = () => { throw new Error('123') }
    x()`
  const rc = {
    presets: ["es2015"],
    plugins: [
      ['../index.js', {
        entries: [
          'index.js',
          'foo/bar.js'
        ]
      }]
    ]
  }
  fs.outputFileSync(tmpPath('src/index.js'), entry)
  fs.outputFileSync(tmpPath('src/foo/bar.js'), entry)
  fs.outputFileSync(tmpPath('.babelrc'), JSON.stringify(rc))
  execSync(`${babelPath} src -d build --source-maps inline`, {cwd: tmpDir})
  exec(`node ${tmpPath('build')}`, (err, stdout, stderr) => {
    {
      const line = stderr.split('\n')[1]
      t.true(line.includes('src/index.js:1'), line)
    }
    exec(`node ${tmpPath('build/foo/bar')}`, (err, stdout, stderr) => {
      reset()
      const line = stderr.split('\n')[1]
      t.true(line.includes('src/foo/bar.js:1'), line)
    })
  })
})

test('is not slow', t => { // some attempts to make this plugin had an awful performance cost
  t.plan(1)
  const env = Object.assign({}, process.env, {BABEL_DISABLE_CACHE: 1})
  const idealTime = (() => {
    const entry = `const x = () => { throw new Error('123') }
      x()`
    fs.outputFileSync(tmpPath('src/index.js'), entry)
    const startTime = new Date().getTime()
    execSync(`${babelPath} src -d build --source-maps`, {cwd: tmpDir, env})
    return new Date().getTime() - startTime
  })()
  reset()
  const entry = `const x = () => { throw new Error('123') }
    x()`
  const rc = {
    plugins: [
      ['../index.js']
    ]
  }
  fs.outputFileSync(tmpPath('src/index.js'), entry)
  fs.outputFileSync(tmpPath('.babelrc'), JSON.stringify(rc))
  const startTime = new Date().getTime()
  execSync(`${babelPath} src -d build --source-maps`, {cwd: tmpDir, env})
  const totalTime = new Date().getTime() - startTime
  reset()
  t.true(totalTime < idealTime + 75, `Took: ${totalTime}ms with plugin, ${idealTime}ms without`)
})
