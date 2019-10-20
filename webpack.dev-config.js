const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // makes index.html
const CleanWebpackPlugin = require('clean-webpack-plugin'); // cleans up dist/ before every build

module.exports = {
  mode: 'development',
  entry: {
    index: './src/testing/index.jsx'
  },
  plugins: [
    new CleanWebpackPlugin(['dev']),
    new HtmlWebpackPlugin({
      title: 'Development',
      template: './src/testing/templates/index.html'
    })
  ],
  output: {
    filename: '[name].bundle.jsx',
    path: path.resolve(__dirname, 'dev')
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dev',
    index: 'index.html',
    clientLogLevel: 'info',
    port: 1234
  },
  module: {
    rules: [
      {
        test: /\.jsx$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
