import { Ng2ThermostatPage } from './app.po';

describe('ng2-thermostat App', function() {
  let page: Ng2ThermostatPage;

  beforeEach(() => {
    page = new Ng2ThermostatPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
