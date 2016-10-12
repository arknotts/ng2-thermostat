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

	events(): Observable<any> {
		return Observable.create((observer: Observer<any>) => {
			this.socket.on('message', (message) => {
				observer.next(message);
			});
		});
	}

	init() {
		this.socket.emit('/init', {});
	}

	start() {
		this.socket.emit('/start', {});
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