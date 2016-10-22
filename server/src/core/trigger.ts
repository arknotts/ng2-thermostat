var gpio = require('rpi-gpio');

export interface ITrigger {
    start(): void;
    stop(): void;
}

export class PiGpioTrigger implements ITrigger {

    // A lot of relays are inverted (turn on when given a LOW signal).
    // If yours is not set _invertRelay to false.
    constructor(private _outPin: number, private _invertRelay: boolean = true) {
        gpio.setup(_outPin, gpio.DIR_OUT, (err) => {
            if(err) throw `Error connecting to pin ${_outPin}: ${err}`;
        });
    }

    private writeToPin(val: boolean) {
        gpio.write(this._outPin, val, function(err) {
            if (err) throw `Error writing to pin ${this._outPin}: ${err}`;
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

export class FurnaceTrigger implements ITrigger {
    start() {

    }

    stop() {
        
    }
}

export class AcTrigger implements ITrigger {
    start() {

    }

    stop() {
        
    }
}