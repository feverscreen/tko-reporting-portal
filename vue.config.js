const {InjectManifest} = require("workbox-webpack-plugin");

module.exports = {
  chainWebpack: (config) => {
    config.plugin('VuetifyLoaderPlugin').tap((args) => [
      {
        match(originalTag, { kebabTag, camelTag, path, component }) {
          if (kebabTag.startsWith('core-')) {
            return [
              camelTag,
              `import ${camelTag} from '@/components/core/${camelTag.substring(
                4
              )}.vue'`,
            ];
          }
        },
      },
    ]);
  },
  configureWebpack: {
    plugins: [
      new InjectManifest({swSrc:"./src/service-worker.ts"})
    ]
  },
  transpileDependencies: ['vuetify'],
};
