import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import * as io from 'socket.io-client';

const PORT:number = 3000;

export enum ThermostatMode {
	Heating,
	Cooling
}

// export interface IThermostatService {
// 	init();
// 	start();
// 	setTarget(target: number);
// 	setMode(mode: ThermostatMode);
// }

@Injectable()
export class ThermostatService {
	socket: SocketIOClient.Socket;
	events$: Observable<any>;

	temperature$: Observable<number>;
	status$: Observable<string>;

	constructor() {
		this.socket = io(`localhost:${PORT}`).connect();
		this.socket.on('connect', () => {
			console.log(`connected on port ${PORT}`);
		});

		this.events$ = Observable.create((observer: Observer<any>) => {
			this.socket.on('message', (message) => observer.next(message));
		}).map((e: any) => JSON.parse(e));

		//TODO share data structure between server/client so string matching isn't necessary
		this.temperature$ = this.events$.filter((event: any) => {
								return event.topic && event.topic.join('/') == 'sensors/temperature/thermostat';
							}).map((event: any): number => {
								return parseFloat(event.message)
							});

		this.status$ = this.events$.filter((event: any) => {
								return event.topic && event.topic.join('/') == 'thermostat/status';
							}).map((event: any): string => {
								return event.message
							});
	}

	init() {
		this.socket.emit('/init', {});
	}

	start() {
		this.socket.emit('/start', {});
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