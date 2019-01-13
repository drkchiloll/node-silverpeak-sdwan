process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import axios, { AxiosInstance } from 'axios';
import properties from './props.json';
import { SilverPeakSdWan } from '../index';

const api = new SilverPeakSdWan({
  host: properties.host,
  user: properties.user,
  pass: properties.password,
  port: 443
});

const service = {
  login() {
    return api.login();
  },
  verifyAuth() {
    return api.verifyAuth();
  },
  getLicense() {
    return api.getLicense();
  },
  register({ name, key}) {
    return api.updateConfig({ name, key });
  }
}

service.register({
  name: properties.cloudRegistration.name,
  key: properties.cloudRegistration.key
}).then((resp) => console.log(resp));

// service.getLicense().then(console.log).catch(e => {
//   console.log(e.response.data)
//   return service.verifyAuth().then(console.log)
// })