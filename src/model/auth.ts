import { CognitoAuth, CognitoAuthSession } from "amazon-cognito-auth-js";

import Router from "@/router"
import UserInfoStore from "@/model/user-info"
import CognitoIdentity from "@/model/cognito-identity"
import DatabaseHandler from "@/model/db-handler"

const HostName = `${window.location.protocol}//${window.location.host}`;

const auth = new CognitoAuth({
  ClientId: "7ijdj7d02sn1jmta9blul42373",
  AppWebDomain: "tekahuora.auth.ap-southeast-2.amazoncognito.com",
  TokenScopesArray: ["email", "openid", "aws.cognito.signin.user.admin"],
  RedirectUriSignIn: HostName,
  RedirectUriSignOut: HostName,
});

auth.userhandler = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSuccess: (_session: CognitoAuthSession): void => {
    const cognitoIdentity = CognitoIdentity(auth);
    const dbHandler = DatabaseHandler(
      auth.getUsername(),
      cognitoIdentity.credentials,
      cognitoIdentity.isSuperAdmin
    );
    UserInfoStore.setCognitoCredentials(cognitoIdentity);
    UserInfoStore.setDatabaseHandler(dbHandler);
    Router.push('/');
  },
  onFailure: () => {
    UserInfoStore.setLoggedOut();
  },
};
auth.useCodeGrantFlow();

export default {
  auth,
  getUserInfo() {
    const cognitoIdentity = CognitoIdentity(auth);
    const dbHandler = DatabaseHandler(
      auth.getUsername(),
      cognitoIdentity.credentials,
      cognitoIdentity.isSuperAdmin
    );
    UserInfoStore.setCognitoCredentials(cognitoIdentity);
    UserInfoStore.setDatabaseHandler(dbHandler);
  },
  login() {
    auth.getSession();
  },
  logout() {
    if (auth.isUserSignedIn()) {
      auth.signOut();
    }
  }
}
