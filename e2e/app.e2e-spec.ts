import { ToucanJSPage } from './app.po';

describe('toucan-js App', function() {
  let page: ToucanJSPage;

  beforeEach(() => {
    page = new ToucanJSPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
