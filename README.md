# babel-plugin-node-sourcemap-support

Adds support for sourcemaps to a node app in a hacky fashion.

The plugin shamefully depends on adding a module to your project directory. A require statement is inserted into your entry files to require the source-map-support module.

It can be argued that it is a better idea to install `source-map-support` into your project and require it yourself.

## install

```sh
npm install babel-plugin-node-sourcemap-support
```

## example

.babelrc
```json
{
  "plugins": [
    ["node-sourcemap-support", {
      "src": "./path/to/src",
      "dest": "./path/to/out/dir",
      "entries": [
        "app.js",
        "foo/bar.js"
      ]
    }]
  ]
}
```

```sh
babel --source-maps inline ./path/to/src --out-dir ./path/to/out/dir
```

## options

### `src: string, ./src`

path to source files directory

### `dest: string, ./build`

path to transpiled files directory

### `entries: [], ['index.js']`

array of app entry file paths, relative to `src`

### `supportModulePath: string, _build-modules/source-map-support-register.js`

path where the module will be added, relative to `dest`

### `cache: boolean, true`

You probably should not turn this off. It prevents the support module from being redundantly copied to `dest` every time babel transpiles a file.
