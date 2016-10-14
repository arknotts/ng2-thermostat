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

	constructor() {
		this.socket = io(`localhost:${PORT}`).connect();
		this.socket.on('connect', () => {
			console.log(`connected on port ${PORT}`);
		});
	}

	get events$(): Observable<any> {
		return Observable.create((observer: Observer<any>) => {
			this.socket.on('message', (message) => {
				observer.next(message);
			});
		}).map((e: any) => JSON.parse(e));
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

	get temperature$(): Observable<number> {
		return this.events$.filter((event: any) => {
								return event.topic && event.topic.join('/') == 'sensors/temperature/thermostat';
							}).map((event: any): number => {
								return parseFloat(event.message)
							});
	}

	get status$(): Observable<string> {
		return this.events$.filter((event: any) => {
								return event.topic && event.topic.join('/') == 'thermostat/status';
							}).map((event: any): string => {
								return event.message
							});
	}
}