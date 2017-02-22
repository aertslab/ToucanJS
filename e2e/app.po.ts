import { browser, element, by } from 'protractor';

export class ToucanJSPage {
  navigateTo() {
    return browser.get(browser.baseUrl + '/');
  }

  getParagraphText() {
    return element(by.css('app-root h1')).getText();
  }
}
