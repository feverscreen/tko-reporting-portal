import Vue from 'vue';
import VueApexCharts from 'vue-apexcharts';
import App from './App.vue';
import router from '@/router';
import vuetify from "@/plugins/vuetify";
import './registerServiceWorker';

Vue.use(VueApexCharts);

new Vue({
  vuetify,
  router,
  render: (h) => h(App),
}).$mount('#app');
