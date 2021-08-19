import Vue from 'vue'
import Router from 'vue-router'
import Home from "@/Home.vue"
import UserInfo from "@/model/user-info"
import Auth from "@/model/auth"

Vue.use(Router)
function requireAuth(to: any, _: any, next: any) {
  if (!Auth.auth.isUserSignedIn()) {
    UserInfo.setLoggedOut();
    if (window.location.href.includes("?code=")) {
      Auth.auth.parseCognitoWebResponse(window.location.href);
    } else {
      Auth.auth.getSession();
    }
  } else {
    Auth.getUserInfo();
    next();
  }
}

export default new Router({
  mode: 'history',
  base: '/',
  routes: [
    {path:'/', name: 'Home', component: Home, beforeEnter: requireAuth}
  ]
})
