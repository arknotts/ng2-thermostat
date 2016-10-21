var gpio = require('rpi-gpio');

export interface ITrigger {
    start(): void;
    stop(): void;
}

class PiGpioTrigger implements ITrigger {
    constructor(private _outPin: number) {
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
        this.writeToPin(true);
    }

    stop() {
        this.writeToPin(false);
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