import * as chai from 'chai';
import * as sinon from 'sinon';
import * as Rx from 'rxjs';

import { ITempResult } from '../../../common/thermostatEvent';
import { ITempReader, MovingAverageTempReader } from './tempReader';
import { ITempSensor, MockTempSensor } from './tempSensor';

var expect = chai.expect;

describe('Moving Average Temp Reader Unit Tests:', () => {

    let tempSensor: ITempSensor;
    let tempRdr: ITempReader;

    let windowSize = 3;

    beforeEach(function() {
        tempSensor = new MockTempSensor(1);
        tempRdr = new MovingAverageTempReader(tempSensor, windowSize);
    });

	describe('initialization', () => {
		it('should not emit a value until the window size has been filled', (done) => {
			let sensorValues: Array<ITempResult> = [68,69,70,71,72].map(x => <ITempResult>{ temperature: x });

            sinon.stub(tempSensor, "start", function() {
                return Rx.Observable.from(sensorValues);
            });
			
            tempRdr.start().first().subscribe(
				(tempResult) => { 
					expect(tempResult.temperature).equals(69);
				},
				() => {},
				() => done()
			);
		});
	});

    describe('adding multiple values', () => {
        it('should take the average', (done) => {
            let sensorValues: Array<ITempResult> = [68,69,70,71,72].map(x => <ITempResult>{ temperature: x });;
			let expectedValues: Array<ITempResult> = [69,70,71].map(x => <ITempResult>{ temperature: x });;

            sinon.stub(tempSensor, "start", function() {
                return Rx.Observable.from(sensorValues);
            });
			
            tempRdr.start().subscribe(
				(tempResult) => { 
					if(expectedValues.length > 0) {
						expect(tempResult.temperature).equals(expectedValues.shift().temperature);
					}
				},
				() => {},
				() => done()
			);
        });
    });
});