import Rx = require('rxjs');
import * as mqtt from 'mqtt';

import { IThermostatEvent, ThermostatEventType } from '../../../common/thermostatEvent';

export class IIoTBridge {
	connect: () => void;
	broadcast: (topic: string, message: any) => void;
	events$: Rx.Observable<IThermostatEvent>;
}

export class MqttBridge implements IIoTBridge {
	private _client: mqtt.Client;
	events$: Rx.Observable<IThermostatEvent>;

	constructor(private _brokerUrl: string, private _username: string, private _password: string) { }

	connect() {
		this._client = mqtt.connect(this._brokerUrl, {
			username: this._username,
			password: this._password
		});

		this._client.on('connect', () => {
			this._client.subscribe('thermostat/#');
		});

		this.events$ = Rx.Observable.fromEvent(this._client, 'message', (topic, message) => <any>{topic, message})
			.map((message) => <IThermostatEvent>{
				topic: (<any>message).topic.split('/'),
				type: ThermostatEventType.Message,
				message: (<any>message).message
			}
		);
	}

	broadcast(topic: string, message: any) {
		//TODO shouldn't need this truthy check, ordering is wrong
		if(this._client) {
			this._client.publish(topic, JSON.stringify(message));
		}
	}
}