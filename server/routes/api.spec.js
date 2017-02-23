var request = require("request");
var base_url = "http://localhost:4200/api";

describe("Hello World Server", function() {
  describe("GET /api", function() {
    it("returns status code 200", function(done) {
      request.get(base_url, function(error, response, body) {
        expect(response.statusCode).toBe(200);
        done();
      });
    });

    it("returns api works", function(done) {
      request.get(base_url, function(error, response, body) {
        expect(body).toBe("api works");
        done();
      });
    });
  });
});