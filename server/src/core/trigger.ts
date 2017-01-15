var environment = process.env.NODE_ENV;
var gpio: any = environment && environment.toUpperCase() === 'PRODUCTION' ? require('rpi-gpio') : null;
var five: any = environment && environment.toUpperCase() === 'PRODUCTION' ? require('johnny-five') : null;

import { SimTempSensor } from '../sim/simTempSensor';

export interface ITrigger {
    start(): void;
    stop(): void;
}

export class PiGpioTrigger implements ITrigger {

    // A lot of relays are inverted (turn on when given a LOW signal).
    // If yours is not set _invertRelay to false.
    constructor(private _outPin: number, private _invertRelay: boolean = true) {
        gpio.setup(_outPin, gpio.DIR_OUT, (err) => {
            if(err) {
                throw `Error connecting to pin ${_outPin}: ${err}`;
            }
            this.stop();
        });
    }

    private writeToPin(val: boolean) {
        gpio.write(this._outPin, val, function(err) {
            if (err) {
                throw `Error writing to pin ${this._outPin}: ${err}`;
            }
        });
    }

    start() {
        let val = this._invertRelay ? false : true;
        this.writeToPin(val);
    }

    stop() {
        let val = this._invertRelay ? true : false;
        this.writeToPin(val);
    }
}

export class JohnnyFiveRelayTrigger implements ITrigger {
    private _board: any;
    private _relay: any;

    constructor(private _outPin: number) {
        this._board = new five.Board();
        this._board.on('ready', () => {
            this._relay = new five.Relay(_outPin);
        });
    }

    start() {
        if(this._relay) {
            this._relay.off();
        }
    }

    stop() {
        if(this._relay) {
            this._relay.on();
        }
    }
}