import { Component, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environments/environment';
import * as moment from 'moment';
import * as _ from 'lodash';

import { ThermostatMode } from '../../../common/thermostatMode';
import * as highchart from './highcharts.global';

import { ThermostatService } from './thermostat.service';

interface IUiTarget {
	target: number;
	writeToApi: boolean;
}

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
	title = '';

	targetDelta$: Subject<IUiTarget>;
	potentialTarget$: Observable<IUiTarget>;
	finalTarget$: Observable<number>;
	displayTarget$: Observable<number>;

	status$: Observable<string>;

	chart: any;
	options: Object;

	constructor(private thermostatService: ThermostatService) {

		this.targetDelta$ = new Subject<IUiTarget>();
		this.potentialTarget$ = this.targetDelta$.scan((acc, val) => {
			return val.target > 1 ?
					val :
					{ target: acc.target + val.target, writeToApi: val.writeToApi };
		});
		this.finalTarget$ = this.potentialTarget$.filter(t => t.writeToApi).map(t => t.target).debounceTime(3000);
		this.displayTarget$ = this.potentialTarget$.map(t => t.target);


		this.status$ = this.thermostatService.status$
							.merge(this.thermostatService.error$)
							.merge(this.potentialTarget$.filter(t => t.writeToApi).map(() => 'pending'))
							.merge(this.finalTarget$.map(() => 'ready'));

		//TODO merge this with regular events$ stream and use error handler on subscribe call				
		this.thermostatService.error$.subscribe((err: string) => {
			console.log('got err', err);
		});

		this.options = _.merge({}, highchart.GLOBAL_OPTIONS, {
			title : { text : 'simple chart' },
			xAxis: {
				type: 'datetime',
				dateTimeLabelFormats: {
					minute: '%I:%M %p'
				}
			},
			series: [
				{
					type: 'line',
				},
				{
					type: 'line',
					step: 'left',
					marker: {
						enabled: false
					}
				}
			]
		});
	}

	ngOnInit() {
		if(!environment.production) {
			//log all events to console for debugging
			this.thermostatService.events$.subscribe((event) => {
				console.log(`${event.topic.join('/')} : ${event.message}`);
			});
		}

		this.thermostatService.target$.subscribe((target) => {
			this.targetDelta$.next({
				target: target,
				writeToApi: false
			});
		});

		this.finalTarget$.subscribe((target: number) => {
			this.thermostatService.setTarget(target);
		});

		this.thermostatService.temperature$.throttleTime(60000)
								.combineLatest(this.thermostatService.target$)
								.subscribe(([temperature, target]) => {

			this.chart.series[0].addPoint([new Date().getTime(), temperature]);
			this.chart.series[1].addPoint([new Date().getTime(), target]);

			if(this.chart.series[0].data.length > 20) {
				this.chart.series[0].removePoint(0);
			}

			if(this.chart.series[1].data.length > 20) {
				this.chart.series[1].removePoint(0);
			}
		});
	}

	saveInstance(chartInstance) {
		this.chart = chartInstance;
	}

	setMode(mode: string) {
		let thermostatMode = (<any>ThermostatMode)[mode];

		if(thermostatMode != null) {
			this.thermostatService.setMode(thermostatMode);
		}
	}



	targetUp() {
		this.targetDelta$.next({
			target: 1,
			writeToApi: true
		});
	}

	targetDown() {
		this.targetDelta$.next({
			target: -1,
			writeToApi: true
		});
	}
}
