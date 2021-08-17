import Vue from "vue";
import App from "./App.vue";
import vuetify from "@/plugins/vuetify";
import VueRouter from "vue-router";
import { Device } from "@/model/db-handler";

Vue.config.productionTip = false;
Vue.use(VueRouter);

if (
  window.location.protocol === "http:" &&
  window.location.host !== "localhost:8080"
) {
  window.location.href = `https://${window.location.host}`;
}

const routes = [
  {path: '/', component: new App()}
]

const router = new VueRouter({
  mode: 'history',
  routes});

new Vue({
  vuetify,
  router,
  render: (h) => h(App),
}).$mount("#app");
