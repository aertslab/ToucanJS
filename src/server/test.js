var Jasmine = require('jasmine');
var reporters = require('jasmine-reporters');

var jasmine = new Jasmine();
jasmine.loadConfigFile('./jasmine.json');
jasmine.configureDefaultReporter({
    showColors: false
});
jasmine.addReporter(new reporters.JUnitXmlReporter({
    savePath: 'tests/',
    consolidateAll: false
}));
jasmine.execute();
