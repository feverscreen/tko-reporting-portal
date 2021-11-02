import CognitoIdentity from "@/model/cognito-identity";
import DatabaseHandler from "@/model/db-handler";

export default {
  state: {
    cognitoCredentials: null as ReturnType<typeof CognitoIdentity> | null,
    databaseHandler: null as ReturnType<typeof DatabaseHandler> | null,
    loggedIn: false,
    loading: true,
    errorLoading: false,
  },
  setLoggedIn(state: boolean) {
    this.state.loggedIn = state;
  },
  setLoggedOut() {
    this.state.loggedIn = false;
    this.state.cognitoCredentials = null;
  },
  setCognitoCredentials(state: ReturnType<typeof CognitoIdentity> | null) {
    if (state) {
      this.state.cognitoCredentials = state;
      this.setLoggedIn(true);
    } else {
      this.setLoggedOut();
    }
  },
  setDatabaseHandler(state: ReturnType<typeof DatabaseHandler> | null) {
    this.state.databaseHandler = state;
  },
};
