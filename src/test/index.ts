process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import axios, { AxiosInstance } from 'axios';
import properties from './props.json';
import { SPOrchestrator } from '../index';

const { host, user, password, cloudRegistration } = properties.gms;

const api = new SPOrchestrator({
  host,
  user,
  pass: password,
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
  name: cloudRegistration.name,
  key: cloudRegistration.key
}).then((resp) => console.log(resp));

// service.getLicense().then(console.log).catch(e => {
//   console.log(e.response.data)
//   return service.verifyAuth().then(console.log)
// })