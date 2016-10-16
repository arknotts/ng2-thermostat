export enum ThermostatEventType {
    Message,
    Error,
    Warning
}

export class ThermostatTopic {
	static Temperature = ['sensors', 'temperature', 'thermostat'];
	static Target = ['thermostat', 'target'];
	static Mode = ['thermostat', 'mode'];
	static Status = ['thermostat', 'status'];
	static Furnace = ['thermostat', 'furnace'];
	static Ac = ['thermostat', 'ac'];
	static Error = ['thermostat', 'error'];
}

export interface IThermostatEvent {
    type: ThermostatEventType;
    topic: Array<string>;
    message: string;
}