import * as mqtt from 'mqtt';

import { IThermostatEvent } from '../../../common/thermostatEvent';

export class IBroadcaster {
	connect: () => void;
	broadcast: (event: IThermostatEvent) => void;
}

export class MqttBroadcaster implements IBroadcaster {
	_client: mqtt.Client;

	constructor(private _brokerUrl: string, private _username: string, private _password: string) { }

	connect() {
		this._client = mqtt.connect(this._brokerUrl, {
			username: this._username,
			password: this._password
		});
	}

	broadcast(event: IThermostatEvent) {
		//TODO shouldn't need this truthy check, ordering is wrong
		if(this._client) {
			this._client.publish('/' + event.topic.join('/'), event.message);
		}
	}
}