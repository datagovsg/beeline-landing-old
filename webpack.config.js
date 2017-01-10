var path = require('path')

// check env & config/index.js to decide weither to enable CSS Sourcemaps for the
// various preprocessor loaders added to vue-loader at the end of this file

module.exports = {
  entry: {
    app: [
      'babel-polyfill',
      './js/suggest.js'
    ]
  },
  output: {
    path: './www/js',
    filename: 'suggest.transpiled.js'
  },
  resolve: {
    extensions: ['', '.js', '.vue'],
    fallback: [path.join(__dirname, './node_modules')],
    alias: {
      'vue$': 'vue/dist/vue',
    }
  },
  resolveLoader: {
    fallback: [path.join(__dirname, 'node_modules')]
  },
  module: {
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      },
      {
        test: /\.js$/,
        loader: 'babel',
        include: /src/,
        exclude: /node_modules/,
      },
      {
        test: /\.json$/,
        loader: 'json'
      },
      {
        test: /\.css/,
        loaders: ['style', 'css'],
      },
      {
        test: /\.scss/,
        loaders: ['style', 'css', 'sass'],
      },
    ]
  },
  resolve: {
    alias: {
      vue: 'vue/dist/vue'
    }
  },
  vue: {
    loaders: {
      sass: 'style!css!sass',
      scss: 'style!css!sass',
      js: 'babel'
    },
  },
  babel: {
    presets: ['es2015', 'stage-2']
  }
}
