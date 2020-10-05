module.exports = {
  transpileDependencies: ["vuetify"],
  publicPath: process.env.NODE_ENV === "production" ? "/portal/" : "",
  configureWebpack: config => {
    config.optimization = {
      ...config.optimization,
      minimize: false
    };
  },
  lintOnSave: false
};
