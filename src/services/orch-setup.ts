import properties from '../test/props.json';
import { SPOrchestrator } from '../index';
import { Requestor } from './requestor';
import Bluebird from 'bluebird';

export const OrchestratorSetupFactory = (params) => {
  const gmsapi = new SPOrchestrator({
    host: params.host,
    user: params.user,
    pass: params.password,
    port: params.port || 443
  });

  const service = {
    cpReg(key: string) {
      const request = Requestor({
        host: 'cloudportal.silver-peak.com',
        endPoint: '/portal/apis/public/rest/tempAccount/create'
      });
      return request.post('', {
        'magic_key': key
      }).then(({ data }) => data);
    },
    spCloudSetup(account: { name, key }) {
      return gmsapi.updateConfig(account);
    },
    setHostname(data) {
      return gmsapi.post({ endpoint: '/gmsHostname', data });
    },
    setDns(data) {
      return gmsapi.post({ endpoint: '/gmsDns', data });
    },
    addInterfaceLabels(data) {
      return gmsapi.post({ endpoint: '/gms/interfaceLabels', data });
    },
    addGroup(data) {
      return gmsapi.post({ endpoint: '/gms/group/new', data });
    },
    setDateTime(data) {
      return gmsapi.post({ endpoint: '/gmsDateTime', data });
    },
    setSmtp(data) {
      return gmsapi.post({ endpoint: '/gmsSMTP', data });
    },
    setBackup(data) {
      return gmsapi.post({ endpoint: '/gms/backup/config', data });
    },
    addAlarmConfig(data) {
      return gmsapi.post({ endpoint: '/gmsConfig', data });
    },
    restartGmsServer() {
      return gmsapi.post({
        endpoint: '/serverMgmt/rebootGmsAppliance',
        data: {}
      }).then(() => new Bluebird((resolve, reject) => setTimeout(() =>
        resolve(), 5000
      )));
    },
    spSettings(settings) {
      // DNS, MGMTSettings, Password Changes
      return gmsapi.login().then(() =>
        Bluebird.all([
          gmsapi.license(settings.license).then(() => {
            if(settings.cloudRegistration.name) {
              return this.spCloudSetup(settings.cloudRegistration)
            } else {
              return this.cpReg(settings.magicKey).then(registration =>
                this.spCloudSetup(registration)
              );
            }
          }),
          this.setHostname({
            gms_hostname: settings.hostname,
            dhcp: false,
            mgmt0_ip: settings.host,
            domain_name: settings.shared.domain
          }),
          this.setDns({
            domain_name: settings.shared.domain,
            primary_dns: settings.shared.primaryDns,
            secondary_dns: settings.shared.secondaryDns || ''
          }),
          this.setDateTime({
            ntp_enable: settings.shared.dateTime.enabled,
            ntp_server: settings.shared.dateTime.servers,
            timezone: settings.shared.dateTime.timezone
          }),
          gmsapi.updateMgmtSettings({}),
          this.setSmtp({
            emailAuthentication: false,
            emailSender: settings.emailSender,
            emailSsl: false,
            password: null,
            smtpPort: 465,
            userID: null
          }),
          this.intLabelHandler(
            'wan', settings.wanLabels, {}
          ).then(wanLabels => this.intLabelHandler(
            'lan', settings.lanLabels, wanLabels
          )).then(labels => this.addInterfaceLabels(labels)),
          gmsapi.get({
            endpoint: '/gms/group'
          }).then(groups => Bluebird.each(groups, (group: any) => {
            if(group.id !== '0.Network') {
              return gmsapi.delete({
                endpoint: `/gms/group/${group.id}`
              })
            } else {
              return;
            }
          }).then(() => this.addGroup({
            name: settings.shared.group,
            parentId: '0.Network',
            backgroundImage: settings.shared.background || ''
          }))),
          gmsapi.post({
            endpoint: '/gmsConfig',
            data: {
              resourceBase: 'alarmConfig',
              configData: [{
                alarmType: 'Appliance',
                applicationGroup: ['0.Network'],
                configurationName: 'test',
                critical: true,
                minor: false,
                warning: false
              }, {
                alarmType: 'GMS',
                applianceGroups: 'none',
                configurationName: 'test',
                critical: true,
                emailAddresses: settings.emailSender,
                major: true,
                minor: false,
                warning: false
              }]
            }
          }),
          gmsapi.post({
            endpoint: '/gms/backup/config',
            data: {
              directory: '',
              hostname: '',
              maxBackups: 1,
              password: '',
              port: 21,
              protocol: 2,
              username: ''
            }
          })
        ]).then(() => this.restartGmsServer()
          .then(() => this.waitForReboot()))
      );
    },
    waitForReboot() {
      return gmsapi.get({ endpoint: '/gmsserver/hello' }).catch((e) =>
        this.waitForReboot()
      );
    },
    intLabelHandler(theLabel: string, labels: any, obj) {
      return Bluebird.reduce(labels, (o, label, i) => {
        if(!o[theLabel]) o[theLabel] = {};
        o[theLabel][i + 1] = {
          name: label,
          active: true
        }
        return o;
      }, obj);
    }
  };
  return service;
};

export interface SPCloudPortalAccountResult {
  name: string;
  key: string;
}