import { BaseServer } from './baseServer';
import { RestServer } from './restServer';
import { SimServer } from './simServer';

//let server = new SimServer();
let server = new RestServer();
server.start();