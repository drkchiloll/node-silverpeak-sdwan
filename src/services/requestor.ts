import axios, { AxiosInstance, AxiosResponse } from 'axios';

export const Requestor = what => axios.create({
	baseURL: `https://${what.host}:${what.port||'443'}${what.apiEndpoint}`,
	headers: { 'Content-Type': 'application/json' },
	adapter: require('axios/lib/adapters/http'),
	withCredentials: true
})