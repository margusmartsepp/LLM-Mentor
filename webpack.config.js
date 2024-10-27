const path = require('path');

module.exports = {
  entry: './src/index.js',  // Entry point for your React app
  output: {
    filename: 'bundle.js',  // Output bundle filename
    path: path.resolve(__dirname, 'dist'),  // Output directory (dist)
  },
  mode: 'development',  // Change to 'production' for production builds
  devtool: 'cheap-module-source-map', 
  module: {
    rules: [
      {
        test: /\.js$/,  // Apply Babel loader for .js and .jsx files
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],  // Use React preset
          },
        },
      },
      {
        test: /\.css$/,  // For CSS files
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],  // Resolve both .js and .jsx
  },
};
