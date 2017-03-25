export enum ThermostatEventType {
    Message,
    Error,
    Warning
}

class ThermostatTopic {
	readonly Temperature = 'sensors/temperature/thermostat';
	readonly Target = 'thermostat/target';
	readonly TargetSet = 'thermostat/target/set';
	readonly Mode = 'thermostat/mode';
	readonly ModeSet = 'thermostat/mode/set';
	readonly Status = 'thermostat/status';
	readonly Furnace = 'thermostat/furnace';
	readonly Fan = 'thermostat/fan';
	readonly Ac = 'thermostat/ac';
	readonly Error = 'thermostat/error';

	allTopics(): string[] {
		return Object.keys(this).map(key => this[key]);
	}
}

export let THERMOSTAT_TOPIC: ThermostatTopic = new ThermostatTopic();

export interface IThermostatEvent {
    type: ThermostatEventType;
    topic: string;
    message: any;
}

export interface ITempResult {
	temperature: number;
	humidity?: number;
}