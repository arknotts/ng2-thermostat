import { Component, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environments/environment';

import { ThermostatMode } from '../../../common/thermostatMode';

import { ThermostatService } from './thermostat.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
	title = '';

	targetDelta$: Subject<number>;
	displayTarget$: Observable<number>;
	finalTarget$: Observable<number>;

	status$: Observable<string>;

	constructor(private thermostatService: ThermostatService) {

		this.targetDelta$ = new Subject<number>();
		this.displayTarget$ = this.targetDelta$.scan((acc, val) => acc+val);
		this.finalTarget$ = this.displayTarget$.debounceTime(3000);
		
		this.status$ = this.thermostatService.status$
							.merge(this.thermostatService.error$)
							.merge(this.displayTarget$.map(() => 'pending'))
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
				console.log(`${event.topic.join('/')} : ${event.message}`);
			});
		}

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


	ngAfterViewInit() {
		this.targetDelta$.next(70);
	}

	targetUp() {
		this.targetDelta$.next(1);
	}

	targetDown() {
		this.targetDelta$.next(-1);
	}
}
