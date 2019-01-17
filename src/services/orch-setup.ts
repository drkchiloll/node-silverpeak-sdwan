import properties from '../test/props.json';
import { SPOrchestrator } from '../index';
import { Requestor } from './requestor';
import BPromise from 'bluebird';

export const OrchestratorSetupFactory = (params) => {
  const gmsapi = new SPOrchestrator({
    host: params.host,
    user: params.user,
    pass: params.pass
  });

  const service = {
    cpReg(key: string) {
      const request = Requestor({
        host: 'cloudportal.silver-peak.com',
        endPoint: '/portal/apis/public/rest/tempAccount/create'
      });
      return request.post('', {
        'magic-key': key
      }).then(({ data }) => data);
    },
    spCloudSetup(account: { name, key }) {
      return gmsapi.updateConfig(account);
    },
    spSettings(settings) {
      // DNS, MGMTSettings, Password Changes
      return BPromise.all([
        gmsapi.post({
          endpoint: `/gmsHostname`,
          data: {
            gms_hostname: settings.hostname, 
            dhcp: false,
            mgmt0_ip: settings.host,
            domain_name: settings.groupCfg.domain
          }
        }),
        gmsapi.post({
          endpoint: '/gmsDns',
          data: {
            domain_name: settings.groupCfg.domain,
            primary_dns: settings.groupCfg.primaryDns,
            secondary_dns: settings.groupCfg.secondaryDns || ''
          }
        }),
        BPromise.reduce(settings.wanLabels, (o, label, i) => {
          o['wan'][i + 1] = {
            name: label,
            active: true
          };
          return o;
        }, {}).then(wanLabels => BPromise.reduce(
          settings.lanLabels, (o, label, i) => {
            o['lan'][i + 1] = {
              name: label,
              active: true
            };
            return o;
          }, wanLabels
        )).then(labels => gmsapi.post({
          endpoint: '/gms/interfaceLabels',
          data: labels
        })),
        gmsapi.get({
          endpoint: '/gms/group'
        }).then(groups => BPromise.each(groups, (group: any) => {
          if(group.id !== '0.Network') {
            return gmsapi.delete({
              endpoint: `/gms/group/${group.id}`
            })
          } else {
            return;
          }
        }).then(() => gmsapi.post({
          endpoint: '/gms/group',
          data: {
            name: settings.groupCfg.group,
            parentId: '0.Network',
            backgroundImage: settings.groupCfg.background || ''
          }
        })))
      ])
    }
  };
  return service;
};

export interface SPCloudPortalAccountResult {
  name: string;
  key: string;
}

const factory = OrchestratorSetupFactory({
  host: '192.168.0.50',
  user: 'admin',
  pass: 'WWTwwt1!'
});
factory.spSettings({})