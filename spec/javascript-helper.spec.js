/**
 * Created by Parri on 12/16/2015.
 */

var jsHelper = require("../javascript-helper.js");
var controllerJson = require("../spec/files/sample.controller.js.json");

describe("javascript-helper", function () {
    it("tests controllerJson", function () {
        var component = jsHelper.findComponent(controllerJson);
        expect(component.type).toBe('controller');
    });
});