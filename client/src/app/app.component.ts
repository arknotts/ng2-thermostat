import { Component, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environments/environment';

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
	}

	ngOnInit() {
		if(!environment.production) {
			//log all events to console for debugging
			this.thermostatService.events$.subscribe((event) => {
				console.log(`${event.topic} : ${event.message}`);
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
	}
	
	setMode(mode: string) {
		let thermostatMode = (<any>ThermostatMode)[mode];
		
		if(thermostatMode != null) {
			this.thermostatService.setMode(thermostatMode);
		}
	}

	startFan() {
		this.thermostatService.startFan();
	}

	stopFan() {
		this.thermostatService.stopFan();
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
