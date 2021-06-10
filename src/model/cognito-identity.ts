import {
  CognitoIdentityClient,
  CognitoIdentityClientConfig,
} from "@aws-sdk/client-cognito-identity";
import {
  COGNITO_ID as cognitoId,
  REGION as region,
  IDENTITY_POOL_ID as identityPoolId,
  ADMIN_ROLE_ARN as customRoleArn,
} from "@/constants";
import { CognitoAuth } from "amazon-cognito-auth-js";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-provider-cognito-identity";

export default function CognitoIdentity(auth: CognitoAuth) {
  const config: CognitoIdentityClientConfig = { region };
  const client = new CognitoIdentityClient(config);
  const idToken = auth.getCachedSession().getIdToken().getJwtToken();
  const loginData = { [cognitoId]: idToken };
  const credentials = fromCognitoIdentityPool({
    client,
    identityPoolId,
    logins: { ...loginData },
  });
  return {
    get credentials() {
      return credentials as CognitoIdentityCredentialProvider;
    },
  };
}
