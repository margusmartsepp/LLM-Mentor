/*
require('ts-node').register({
    compilerOptions: {
        module: 'CommonJS'
    }
});
module.exports = require('./webpack.config.ts');
*/
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin'); // Import the plugin
module.exports = {
    entry: {
        'client-bundle': './src/index.tsx',
        'server-bundle': './src/background.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    devtool: 'source-map',
    optimization: {
        minimize: false, // Disable JavaScript minification for debugging
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'sidebar.html',
            template: 'public/sidebar.html',
            chunks: ['client-bundle'],
            inject: 'body', // Inject scripts at the end of the body
            minify: false // Disable minification for debugging
        }),
        new CopyPlugin({
            patterns: [
                { from: 'public/icons', to: 'icons' },
                { from: 'manifest.json', to: '.' },
                // ... other copy patterns
            ],
        }),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};