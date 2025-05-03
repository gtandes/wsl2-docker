export type BullhornCredential = {
  agency_id?: string;
  client_id?: string;
  client_username?: string;
  client_password?: string;
  client_secret?: string;
  is_verified?: boolean;
};

export type OAuthLoginInfoResponse = {
  atsUrl: string;
  billingSyncUrl: string;
  coreUrl: string;
  documentEditorUrl: string;
  mobileUrl: string;
  oauthUrl: string;
  restUrl: string;
  samlUrl: string;
  novoUrl: string;
  pulseInboxUrl: string;
  canvasUrl: string;
  npsSurveyUrl: string;
  ulUrl: string;
  dataCenterId: number;
  superClusterId: number;
};

export type OAuthAccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

export type RestApiLoginResponse = {
  BhRestToken: string;
  restUrl: string;
};

export const BULLHORN_LOGIN_INFO_URL = "https://rest.bullhornstaffing.com/rest-services/loginInfo";
