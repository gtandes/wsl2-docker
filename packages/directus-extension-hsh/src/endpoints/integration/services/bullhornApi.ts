import {
  BULLHORN_LOGIN_INFO_URL,
  BullhornCredential,
  OAuthAccessTokenResponse,
  OAuthLoginInfoResponse,
  RestApiLoginResponse,
} from "../types";

export class BullhornOAuthApi {
  private bhResource: BullhornCredential;
  private loginInfo?: OAuthLoginInfoResponse;
  private authCode?: string;
  private accessTokenInfo?: OAuthAccessTokenResponse;
  private restApiLoginResponse?: RestApiLoginResponse;

  constructor(bhResource: BullhornCredential) {
    this.bhResource = bhResource;
  }

  private async request<T>({
    method,
    url,
    data,
    params,
    headers,
  }: {
    method: string;
    url: string;
    data?: Record<string, unknown>;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }): Promise<T> {
    const urlObj = new URL(url);
    if (params) {
      urlObj.search = new URLSearchParams(params).toString();
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    };

    try {
      const response = await fetch(urlObj.toString(), options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}. Body: ${errorText}`);
      }

      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes("application/json")) {
        return response.json() as Promise<T>;
      }

      throw new Error(`Expected JSON response, but got ${contentType}`);
    } catch (error) {
      console.error(`Request to ${url} failed:`, error);
      throw error;
    }
  }

  private async fetchLoginInfo(): Promise<OAuthLoginInfoResponse> {
    const result = await this.request<OAuthLoginInfoResponse>({
      method: "GET",
      url: BULLHORN_LOGIN_INFO_URL,
      params: { username: this.bhResource.client_username! },
    });
    this.loginInfo = result;
    return result;
  }

  private async fetchAuthorizationCode(): Promise<string> {
    if (!this.loginInfo?.oauthUrl) {
      throw new Error("OAuth URL is missing");
    }

    const url = `${this.loginInfo.oauthUrl}/authorize`;
    const params = {
      client_id: this.bhResource.client_id ?? "",
      response_type: "code",
      action: "Login",
      username: this.bhResource.client_username ?? "",
      password: this.bhResource.client_password ?? "",
    };

    const response = await fetch(url + "?" + new URLSearchParams(params).toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
    });

    if (response.status === 302) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Location header is missing in the response");
      }

      const codeMatch = location.match(/[?&]code=([^&]+)/);
      if (!codeMatch || !codeMatch[1]) {
        throw new Error("Authorization code not found in redirect URL");
      }

      return decodeURIComponent(codeMatch[1]);
    }

    throw new Error(`Unexpected response: ${response.status}`);
  }

  private async fetchAccessToken(): Promise<OAuthAccessTokenResponse> {
    if (!this.loginInfo?.oauthUrl || !this.bhResource.client_id || !this.bhResource.client_secret || !this.authCode) {
      throw new Error("Missing required OAuth parameters");
    }

    return this.request<OAuthAccessTokenResponse>({
      method: "POST",
      url: `${this.loginInfo.oauthUrl}/token`,
      params: {
        grant_type: "authorization_code",
        code: this.authCode,
        client_id: this.bhResource.client_id,
        client_secret: this.bhResource.client_secret,
      },
    });
  }

  private async fetchSessionKey(): Promise<RestApiLoginResponse> {
    if (!this.accessTokenInfo?.access_token) {
      throw new Error("Access token is missing");
    }

    return this.request<RestApiLoginResponse>({
      method: "GET",
      url: `${this.loginInfo?.restUrl}/login`,
      params: {
        version: "2.0",
        access_token: this.accessTokenInfo.access_token,
      },
    });
  }

  public async login(): Promise<RestApiLoginResponse & OAuthAccessTokenResponse> {
    try {
      await this.fetchLoginInfo();
      this.authCode = await this.fetchAuthorizationCode();
      this.accessTokenInfo = await this.fetchAccessToken();
      this.restApiLoginResponse = await this.fetchSessionKey();
    } catch (error) {
      throw error;
    }

    return {
      ...this.accessTokenInfo,
      ...this.restApiLoginResponse,
    };
  }
}
