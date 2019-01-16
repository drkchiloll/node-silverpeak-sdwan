import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class SPOrchestrator {
  private request: AxiosInstance;
  private credentials: { user, password };
  private cloudHost = 'cloudportal.silver-peak.com'
  constructor({ host, user, pass, port = 443, session = null }) {
    this.request = axios.create({
      baseURL: `https://${host}/gms/rest`,
      headers: { 'Content-Type': 'application/json' },
      adapter: require('axios/lib/adapters/http'),
      withCredentials: true
    });
    this.credentials = { user, password: pass };
    if(session) {
      this.request.defaults.headers['Cookie'] = session;
    }
  }
  login(): Promise<void> {
    return this.request.post(`/authentication/login`, {
      user: this.credentials.user,
      password: this.credentials.password
    }).then(resp => {
      if(resp && resp.headers) {
        this.request.defaults.headers['Cookie'] =
          resp.headers['set-cookie'][0];
        return this.request.defaults.headers.Cookie;
      }
    }).catch(e => e);
  }
  verifyAuth(): Promise<AuthVerify> {
    return this.request.get('/authentication/loginStatus')
      .then(({ data }: AxiosResponse<AuthVerify>): any => {
        if(!data.isLoggedIn) return this.login()
        else return data;
      })
  }
  license(licenseKey: string): Promise<LicenseResp> {
    return this.request.post('/gmsLicense', {
      licenseKey
    }).then(({ data }) => data)
  }
  getLicense(): Promise<LicenseResp> {
    return this.request.get('/gmsLicense')
      .then(({ data }: AxiosResponse<LicenseResp>) => data);
  }
  updateConfig({ name, key }): any {
    const config: SpPortalConfig = {
      host: this.cloudHost,
      port: 443,
      registration: { account: name, key } 
    };
    return this.verifyAuth().then(() => this.request.post(
      `/spPortal/config`, config
    ).then(({ data }: AxiosResponse<SpPortalConfig>) =>
      this.registerConfig(data)
    ));
  }
  private registerConfig(config) {
    return this.request.post(
      '/spPortal/registration', config 
    ).then(({ data }) => data);
  }
}

export interface AuthVerify {
  isLoggedIn: boolean;
  user: string;
  isMtoSso: boolean;
}

export interface LicenseResp {
  availableApplicances: number;
  licenseKey: string;
  rc: number;
  code: number;
  serialNumber: string;
  usedAppliances: number;
  portalBasedExpiration: null;
  maxAppliances: number;
  daysToExpiration: number;
  message: string;
  gmsLicenseBasedExpiration: null;
  expirationDate: number;
}

export interface SpPortalConfig {
  host: string;
  port: number,
  registration: {
    accountId?: string;
    account: string;
    key: string;
    group?: string;
    site?: string;
  }
}

export interface SpPortalRegistration {
  emails: string[];
  site?: string;
  accountName: string;
  registered: boolean;
  enabled: boolean;
  accountKey: string;
  pendingPoll: boolean;
  group: string;
}