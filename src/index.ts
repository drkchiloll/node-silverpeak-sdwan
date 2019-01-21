process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class SPOrchestrator {
  private request: AxiosInstance;
  private credentials: { user, password };
  constructor({ host, user, pass, port = 443, session = null }) {
    this.request = axios.create({
      baseURL: `https://${host}:${port}/gms/rest`,
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
  get(params) {
    return this.verifyAuth().then(() => this.request.get(
      params.endpoint, 
    )).then(({ data }) => data);
  }
  post(params) {
    return this.verifyAuth().then(() => this.request.post(
      params.endpoint, params.data
    )).catch(() => {})
  }
  put(params) {
    return this.verifyAuth().then(() => this.request.put(
      params.endpoint, params.data
    )).then(({ data }) => data);
  }
  delete(params) {
    return this.verifyAuth().then(() => this.request.delete(
      params.endpoint
    ))
  }
  license(licenseKey: string) {
    return this.post({
      endpoint: '/gmsLicense',
      data: { licenseKey }
    }).then((result: AxiosResponse<LicenseResp>) => result)
  }
  getLicense(): Promise<LicenseResp> {
    return this.request.get('/gmsLicense')
      .then(({ data }: AxiosResponse<LicenseResp>) => data);
  }
  updateConfig({ name, key }): Promise<SpPortalConfig> {
    const config: SpPortalConfig = {
      host: CloudPortal.host,
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
      '/spPortal/registration', {}
    ).then(({ data }) => data);
  }
  updateMgmtSettings(settings) {
    return this.put({
      endpoint: '/gmsConfig/managementSettings',
      data: {
        configData: {
          cpx: true, ec: true, nx: true,
          saas: true, vrx: true, vx: true
        },
        version: 0
      }
    }).then(({ data }) => data);
  }
  changePassword(params) {
    return this.post({
      endpoint: `/users/${params.user}/password`,
      data: { oldPassword: params.old, newPassword: params.new }
    })
  }
}

export interface AuthVerify {
  isLoggedIn: boolean;
  user: string;
  isMtoSso: boolean;
}

export interface GmsServerInfo {
  release: string;
  role: number;
  serverStartTime: Date;
  numActiveUsers: number;
  hostName: string;
  host: string;
  time: Date;
  serialNumber: string;
  domain: string;
  osRev: string;
  memSize: number;
  numCpus: number;
  model: string;
  hwRev: string;
  usedDiskSpace: string;
  freeDiskSpace: string;
  loadAverage: string;
  portalObjectId: string;
  portalRegistrationUuid: string;
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
  host: CloudPortal.host;
  port: CloudPortal.port,
  registration: {
    accountId?: string;
    account: string;
    key: string;
    group?: string;
    site?: string;
  }
}

export interface InterfaceLabels {
  wan: {
    [key: string]: { name: string; active: boolean; }
  };
  lan: {
    [key: string]: { name: string; active: boolean; }
  };
}

export enum CloudPortal {
  host = 'cloudportal.silver-peak.com',
  port = 443
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

export interface SPNtp {
  ntp_enable: boolean;
  ntp_server: [{
    [server_1: string]: string;
  }],
  timezone: string;
}