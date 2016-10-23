import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { ThermostatService } from './thermostat.service';
import { AppComponent } from './app.component';

let thermostatService: ThermostatService = new ThermostatService('localhost', 3000);

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
  ],
  providers: [{provide: ThermostatService, useValue: thermostatService}],
  bootstrap: [AppComponent]
})
export class AppModule { }
