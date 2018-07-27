var http = require('http');

var handler = require('./src/handler');
var fs = require('fs');
var parser = require('url');
var handlers = {};
var def = '/';
var method = 'POST';
var default_port = 80;

var log = (message) => {

  if(!message) return;

  if (typeof message == 'object')
    console.log('[hook-server] ' + JSON.parse(message));
  else if(typeof message == 'string')
    console.log('[hook-server] ' + message);
  else
    console.log('[hook-server] Error');
}

var isEmptyObject = (obj) => !Object.keys(obj).length;

var HookServer = ( () => {
  var same;

  var _capture = (req) => {
    var message;

    if (typeof req.rawBody == 'object') {
      message = req.rawBody;
    } else if(typeof req.body == 'object') {
      message = req.body;
    }

    try {
      same.obj[message[same.action]](message);
    } catch(e) { /**/ }

    if(same.interceptor)
      same.interceptor(same.parser
        ? (isEmptyObject(message) ? message : req.rawBody)
        : req.rawBody
      );
  }

  var _toHandler = (url, method, call) => {
    log('service.' + url);
    handlers[method + url] = handler.create(call);
    handlers[method + url].method = method;
  }

  var _missing = (req) => {
    var url = parser.parse(req.url, true);
    return handler.create(function(req, res) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('404 not found to' + url.pathname);
      res.end();
    });
  }

  var _setRoute = (req) => {
    url = parser.parse(req.url, true);
    var handler = handlers[req.method + url.pathname];

    if (!handler)
      handler = _missing(req)
      else if(handler.method != req.method)
        handler = _missing(req)

    return handler;
  }

  class HookServer {

    constructor(opts) {
      this.obj = {};
      this.interceptor;
      this.action;

      same = this;
    }

    filter(url, call) {
      _toHandler(url, method, call);
    }

    option(opt) {
      if (typeof opt !== 'object') throw new TypeError('Option expected an Object')

      if (opt.parser) {
        if (typeof opt.parser !== 'boolean') throw new TypeError('Option parser expected an boolean')
        this.parser = opt.parser;
      } else {
        this.parser = false;
      }

      this.action = opt.action;
      this.__route = opt.route;
    }

    start(port, callback) {
      this.port = port ? port : default_port;

      this.filter(this.__route ? this.__route : def, function(req, res){
        _capture(req);
        res.end();
      });

      var server = http.createServer(function (req, res) {
        var handler = _setRoute(req);
        handler.process(req, res);
      });

      server.listen(this.port, function(err){
        if(err) throw new TypeError(err.message);

        console.log("[hook-server] is started on " + port);
        callback()
      });
    }

    all(call) {
      if (typeof call !== 'function') throw new TypeError('callback not is one function')
      this.interceptor = call;

      return this;
    }

    on(action, call) {
      if (typeof action !== 'string') throw new TypeError('action is required')
      if (typeof call !== 'function') throw new TypeError('callback not is one function')

      try {
        if (same.obj[action]) {
          log(action + " already exists");
        } else {
          same.obj[action] = call;
          log("name." + action);
        }
      } catch (e) {
        log("error on add action" + e.message);
      }

      return this;
    }
  }

  var hook = new HookServer();

  return hook;
})();

module.exports = HookServer;
