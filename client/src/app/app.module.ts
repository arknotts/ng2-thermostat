import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { APP_CONFIG, GetConfig } from'../app.config';
import { ThermostatService } from './thermostat.service';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
  ],
  providers: [
    {provide: APP_CONFIG, useValue: GetConfig()},
    ThermostatService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
