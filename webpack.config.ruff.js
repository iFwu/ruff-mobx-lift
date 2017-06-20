var path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'build'),
    libraryTarget: 'var'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components|ruff_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['es2015', { 'modules': false }], ['stage-1']],
            plugins: ['transform-decorators-legacy']
          }
        }
      }
    ]
  },
  target: 'node'
}
