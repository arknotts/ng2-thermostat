import { Component, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environments/environment';

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
  pending: boolean;
	thermostatService: ThermostatService;
	temperature$: Observable<number>;
	status$: Observable<string>;

	constructor(thermostatService: ThermostatService) {
		this.thermostatService = thermostatService;
    this.pending = false;
		this.temperature$ = this.thermostatService.temperature$;
		this.status$ = this.thermostatService.status$;

		if(!environment.production) {
			//log all events to console for debugging
			this.thermostatService.events$.subscribe((message) => {
				console.log(message);
			});
		}

		this.targetDelta$ = new Subject<number>();
		this.displayTarget$ = this.targetDelta$.scan((acc, val) => acc+val);
		this.displayTarget$.debounceTime(3000)
						.subscribe((target: number) => {
              this.thermostatService.setTarget(target)
              this.pending = false;
            });
	}

	ngOnInit() {
		this.thermostatService.init();
    this.thermostatService.start();
	}

	start() {
		this.thermostatService.start();
	}

	reset() {
		this.thermostatService.reset();
		this.thermostatService.init();
		this.thermostatService.start();
	}

	ngAfterViewInit() {
		this.targetDelta$.next(70);
	}

	targetUp() {
		this.targetDelta$.next(1);
    this.pending = true;
	}

	targetDown() {
		this.targetDelta$.next(-1);
    this.pending = true;
	}
}
