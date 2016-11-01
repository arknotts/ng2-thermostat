import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environments/environment';
import { BaseChartDirective } from 'ng2-charts/ng2-charts';
import * as moment from 'moment';

import { ThermostatMode } from '../../../common/thermostatMode';

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

	//tempHistory: Array<number> = [];
	//targetHistory: Array<any>;
	lineChartData: Array<any>;
	lineChartOptions: any = {
		animation: false,
		responsive: true
	};
	lineChartLabels:Array<any> = [];
	lineChartColors: Array<any> = [
		{ // grey
			backgroundColor: 'rgba(148,159,177,0.2)',
			borderColor: 'rgba(148,159,177,1)',
			pointBackgroundColor: 'rgba(148,159,177,1)',
			pointBorderColor: '#fff',
			pointHoverBackgroundColor: '#fff',
			pointHoverBorderColor: 'rgba(148,159,177,0.8)'
		},
	];

	@ViewChild(BaseChartDirective) chart: BaseChartDirective;

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

		this.lineChartData = [
			{
				data: this.thermostatService.temperature$
											.throttleTime(60000)
											.takeLast(5)
											.toArray(),
				label: 'ºF'
			},
			//{data: this.targetHistory, label: 'Target'}
		];
		
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

		//TODO can we do this using only observables?
		this.thermostatService.temperature$.throttleTime(60000).subscribe((temperature) => {
			// this.tempHistory.push(temperature);
			// this.lineChartLabels.push(moment().format('h:mm'));

			// if(this.tempHistory.length > 20) {
			// 	this.tempHistory.shift();
			// }

			// if(this.lineChartLabels.length > 20) {
			// 	this.lineChartLabels.shift();
			// }

			this.chart.ngOnChanges({});
			//TODO trim to fixed length
		});
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
