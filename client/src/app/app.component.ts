import { Component, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';

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
	temperature$: Observable<number>;
  pending: boolean;
	thermostatService: ThermostatService;

	constructor(thermostatService: ThermostatService) {
		this.thermostatService = thermostatService;
    this.pending = false;
		let events = this.thermostatService.events();

		this.temperature$ = events.map((e: any) => JSON.parse(e))
		.filter((event: any) => {
			if(event.topic) {
				console.log(event.topic.join('/'));
			}
			return event.topic && event.topic.join('/') == 'sensors/temperature/thermostat';
		}).map((event: any): number => {
			return parseFloat(event.message)
		});

		events.subscribe((message) => {
			console.log(message);
		});

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
