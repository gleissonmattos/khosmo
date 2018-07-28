var http = require('http');

var handler = require('./src/handler');
var fs = require('fs');
var Url = require('url');
var handlers = {};
var def = '/';
var method = 'POST';
var default_port = 80;
var requests = {};

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

  var _objectToQuerystring = (obj) => {
    return Object.keys(obj).reduce(function (str, key, i) {
      var delimiter, val;
      delimiter = (i === 0) ? '?' : '&';
      key = encodeURIComponent(key);
      val = encodeURIComponent(obj[key]);
      return [str, delimiter, key, '=', val].join('');
    }, '');
  }

  var _capture = (req) => {
    var message;

    if (typeof req.rawBody == 'object') {
      message = req.rawBody;
    } else if(typeof req.body == 'object') {
      message = req.body;
    }

    try {
      same.receiver[message[same.action]](message);
    } catch(e) { /**/ }

    if(same.interceptor)
      same.interceptor(same.parser
        ? (isEmptyObject(message) ? message : req.rawBody)
        : req.rawBody
      );
  }

  var _toHandler = (url, method, call) => {
    log('service.' + url);

    var cap = (req, res) => {
      _capture(req);
      call(req, res);
      res.end();
    }

    handlers[method + url] = handler.create(cap);
    handlers[method + url].method = method;
  }

  var _missing = (req) => {
    var url = Url.parse(req.url, true);
    return handler.create(function(req, res) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('404 not found to' + url.pathname);
      res.end();
    });
  }

  var _setRoute = (req) => {
    url = Url.parse(req.url, true);
    var handler = handlers[req.method + url.pathname];

    if (!handler)
      handler = _missing(req)
      else if(handler.method != req.method)
        handler = _missing(req)

    return handler;
  }

  var _generateRequest = (lnk) => {
    return post = (data) => {

      //var post_data = _objectToQuerystring(data);
      data = data ? data : {};

      var url = Url.parse(lnk);
      console.log(url);
      var options = {
        host: url.hostname,
          path: url.pathname,
          port: url.port,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer token"
          }
      };

      var req = http.request(options, function (res) {
          var responseString = "";

          res.on("data", function (data) {
              responseString += data;
          });

          res.on("end", function () {
              // responseString
              console.log('end trigger sending');
          });
      });

      req.write(JSON.stringify(data));
      req.end();
    }
  }

  class HookServer {

    constructor(opts) {
      this.receiver = {};
      this.trigger = {};
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
        log("Request received on api")
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

    create(name, url) {
      if (typeof name !== 'string') throw new TypeError('trigger name not is string')
      if (typeof url !== 'string') throw new TypeError('url not is string')
      //if (typeof call !== 'function') throw new TypeError('callback not is one function')

      try {
        if (same.trigger[name]) {
          log(name + " trigger already exists");
        } else {
          same.trigger[name] = url;
          requests[name] = _generateRequest(url);
          log("trigger." + name);
        }
      } catch (e) {
        log("error on create trigger: " + e.message);
      }
      return this;
    }

    send(name, data) {
      if (typeof name !== 'string') throw new TypeError('url not is string')
      //if (typeof data !== 'object') throw new TypeError('callback not is one function')
      requests[name](data);
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
        if (same.receiver[action]) {
          log(action + " already exists");
        } else {
          same.receiver[action] = call;
          log("name." + action);
        }
      } catch (e) {
        log("error on add action: " + e.message);
      }

      return this;
    }
  }

  var hook = new HookServer();

  return hook;
})();

module.exports = HookServer;
