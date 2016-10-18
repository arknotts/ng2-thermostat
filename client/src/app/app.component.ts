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
							
		this.thermostatService.error$.subscribe((err: string) => {
			console.log('got err', err);
		});
	}

	ngOnInit() {
		if(!environment.production) {
			//log all events to console for debugging
			this.thermostatService.events$.subscribe((event) => {
				console.log(event);
			});
		}

		this.finalTarget$.subscribe((target: number) => {
			this.thermostatService.setTarget(target);
		});

		this.thermostatService.init();
    	this.thermostatService.start();
	}
	
	setMode(mode: string) {
		this.thermostatService.reset();
		let thermostatMode = mode == 'heat' ? ThermostatMode.Heating : 
				   			 mode == 'cool' ? ThermostatMode.Cooling : null;
		
		if(thermostatMode != null) {
			this.thermostatService.init();
			this.thermostatService.setMode(thermostatMode);	
			this.thermostatService.start();
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
