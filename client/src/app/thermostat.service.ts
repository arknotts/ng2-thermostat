import { Injectable, Inject } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import * as io from 'socket.io-client';
import * as _ from 'lodash';

import { AppConfig, APP_CONFIG } from '../app.config';
import { ThermostatMode } from '../../../common/thermostatMode';
import { IThermostatEvent, ThermostatEventType, ThermostatTopic } from '../../../common/thermostatEvent';

@Injectable()
export class ThermostatService {
	socket: SocketIOClient.Socket;
	events$: Observable<IThermostatEvent>;

	temperature$: Observable<number>;
	status$: Observable<string>;
	error$: Observable<string>;

	constructor(@Inject(APP_CONFIG) appConfig: AppConfig) {
		this.socket = io(`${appConfig.serverAddress}:${appConfig.port}`).connect();
		this.socket.on('connect', () => {
			console.log(`connected on port ${appConfig.port}`);
		});

		this.events$ = Observable.create((observer: Observer<IThermostatEvent>) => {
			this.socket.on('message', (message) => observer.next(message));
		});

		this.temperature$ = this.events$.filter((event: IThermostatEvent) => _.isEqual(event.topic, ThermostatTopic.Temperature))
										.map((event: IThermostatEvent): number => parseFloat(event.message));

		this.status$ = this.events$.filter((event: IThermostatEvent) => _.isEqual(event.topic, ThermostatTopic.Status))
									.map((event: IThermostatEvent): string => event.message);
							
		this.error$ = this.events$.filter((event: IThermostatEvent) => event.type == ThermostatEventType.Error)
									.map((event: IThermostatEvent) => event.message);
	}

	reset() {
		this.socket.emit('/reset', {});
	}

	setTarget(target: number) {
		this.socket.emit('/target', {
			target: target
		});
	}

	setMode(mode: ThermostatMode) {
		this.socket.emit('/mode', {
			mode: mode
		});
	}
}