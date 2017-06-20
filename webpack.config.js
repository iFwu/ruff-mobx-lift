const path = require('path');
const webpack = require('webpack');

module.exports = {
  devtool: 'inline-source-map',
  entry: [
    'react-hot-loader/patch',
    'webpack-dev-server/client?http://0.0.0.0:3000',
    'webpack/hot/only-dev-server',
    'babel-polyfill',
    './src/index'
  ],
  devServer: {
    hot: true,
    contentBase: path.resolve(__dirname, './'),
    port: 3000,
    host: '0.0.0.0',
    publicPath: '/static/',
    historyApiFallback: true,
    disableHostCheck: true
  },
  output: {
    path: path.join(__dirname, './static/'),
    filename: 'bundle.js',
    publicPath: '/static/'
  },
  plugins: [
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin()
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  },
  module: {
    loaders: [{
      test: /\.jsx?$/,
      exclude: /node_modules/,
      loaders: ['babel-loader'],
      include: path.join(__dirname, 'src')
    }]
  }
};
