import {NCPProperties} from './App';
import {Pingburst, PingburstAbortStatus, RequestStatus, Topology} from './types';

export class APIService {
  static host: string = window.location.origin;

  public static get pingResultsRoute() {
    return `${APIService.host}/PingResults.csv`;
  }

  static prependHost(route: string): string {
    return `${APIService.host}${route}`;
  }

  static async fetchJSON(route: string, fetchOptions?: any): Promise<any> {
    let res;
    try {
      res = await fetch(APIService.prependHost(route), fetchOptions);
    } catch (e) {
      //network error
      throw e;
    }
    try {
      const data = res.json();
      return data;
    } catch (e) {
      //json parsing error
      throw e;
    }
  }

  static async getReset(): Promise<RequestStatus> {
    const {wasSuccess} = await APIService.fetchJSON('/reset');
    return wasSuccess;
  }
  static async getTopology(): Promise<Topology> {
    return await APIService.fetchJSON('/topology');
  }
  static async getProps(): Promise<NCPProperties> {
    const data = await APIService.fetchJSON('/getProps');
    return data;
  }
  static async setProp(
    property: keyof NCPProperties,
    value: NCPProperties[keyof NCPProperties]
  ): Promise<RequestStatus> {
    const data = await APIService.fetchJSON(`/setProp?property=${property}&newValue=${value}`);
    return data;
  }

  static async macfilterUpdate(
    insert: boolean,
    value: NCPProperties[keyof NCPProperties]
  ): Promise<RequestStatus> {
    const data = await APIService.fetchJSON(`/macfilterUpdate?insert=${insert}&newValue=${value}`);
    return data;
  }

  static async getConnected(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);
    const success = await APIService.fetchJSON('/connected', {signal: controller.signal});
    clearTimeout(timeoutId);
    return success;
  }

  //** Initiate a pingburst */
  static async postPingburst(body: Object): Promise<number> {
    const requestOpts = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify(body),
    };
    const {id} = await APIService.fetchJSON('/pingbursts', requestOpts);
    return id;
  }

  static async cancelAutoPing() {
    APIService.fetchJSON('/cancelAutoPing');
  }

  //**Abort Pingburst */
  static async abortPingburst(destIP: string): Promise<PingburstAbortStatus> {
    const requestOpts = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify({destIP: destIP}),
    };
    return await APIService.fetchJSON(`/abortpingburst`, requestOpts);
  }

  //**Abort all pingbursts */
  static async abortAllPingbursts() {
    return await APIService.fetchJSON(`/abortAllPingbursts`);
  }

  //**Set the LED states */
  static async setLEDs(ipAddresses: string[], color: string, newValue: boolean) {
    const requestOpts = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify({ipAddresses: ipAddresses, color: color, newValue: newValue}),
    };
    return await APIService.fetchJSON(`/setLEDStates`, requestOpts);
  }
}
