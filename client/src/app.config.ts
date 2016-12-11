import * as fs from 'fs';
import { OpaqueToken } from '@angular/core';

export interface AppConfig {
  serverAddress: string;
  port: number;
}

// export const THERMOSTAT_CONFIG: AppConfig = {
//   serverAddress: 'localhost',
//   //serverAddress: '192.168.0.103',
//   port: 3000
// };

export class ClientConfig implements AppConfig {
  serverAddress: string;
  port: number;

  loadFromFile() {
    fs.readFile(`${__dirname}/client.config.json`, (err, data) => {
			if(err) throw err;

			let configuration: AppConfig = JSON.parse(<any>data);
			this.serverAddress = configuration.serverAddress;
      this.port = configuration.port;
		});
  }
}

export function GetConfig(): AppConfig {
  let config = new ClientConfig();
  config.loadFromFile();
  return config;
}

export let APP_CONFIG = new OpaqueToken('app.config');