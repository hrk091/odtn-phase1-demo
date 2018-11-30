const proxy = require('http-proxy-middleware');
module.exports = function(app) {
  app.use(proxy('/onos', {
    "target": "http://localhost:8181/onos/v1",
    "pathRewrite": {
      "^/onos": "",
    },
    "secure": false,
    "preserveHeaderKeyCase": true,
    "headers": {
      "Authorization": "Basic b25vczpyb2Nrcw=="
    }
  }))

  app.use(proxy('/dcs', {
    "target": "http://localhost:8181/onos/restconf",
    "pathRewrite": {
      "^/dcs": "",
    },
    "secure": false,
    "preserveHeaderKeyCase": true,
    "headers": {
      "Authorization": "Basic b25vczpyb2Nrcw=="
    }
  }))

}