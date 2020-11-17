import Vue from "vue";
import App from "./App.vue";
import vuetify from "@/plugins/vuetify";
Vue.config.productionTip = false;

if (window.location.protocol === "http:" && window.location.host !== 'localhost:8080') {
  window.location.href = `https://${window.location.host}`;
}

new Vue({
  vuetify,
  render: h => h(App)
}).$mount("#app");
