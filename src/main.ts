import Vue from 'vue';
import VueApexCharts from 'vue-apexcharts';
import App from './App.vue';
import router from '@/router';
import vuetify from "@/plugins/vuetify";
import './registerServiceWorker';

Vue.use(VueApexCharts);

function setManifest() {
  const dynamicManifest = {
    "name":"Te Kahu Ora QR",
    "short_name":"Tko QR",
    "icons":[{"src":`http://${window.location.host}/tko_icon_x512.png`,
      "sizes":"512x512","type":"image/png",
      "purpose": "any maskable"}],
    "theme_color":"#ffffff",
    "background_color":"#ffffff",
    "display":"standalone", 
    "start_url": window.location.toString()}

  const link = document.createElement("link");
  link.rel = "manifest";
  const stringManifest = JSON.stringify(dynamicManifest);
  link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(stringManifest))
  document.head.appendChild(link);
}

router.afterEach(() => {
  setManifest()
})

new Vue({
  vuetify,
  router,
  render: (h) => h(App),
}).$mount('#app');
