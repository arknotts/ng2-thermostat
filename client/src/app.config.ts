import { OpaqueToken } from '@angular/core';

export interface AppConfig {
  serverAddress: string;
  port: number;
}

export const THERMOSTAT_CONFIG: AppConfig = {
  serverAddress: 'localhost',
  //serverAddress: '192.168.0.103',
  port: 3000
};

export let APP_CONFIG = new OpaqueToken('app.config');