const http = require('http');

const handler = require('./src/handler');
const fs = require('fs');
const Url = require('url');
const handlers = {};
const def = '/';
let method = 'POST';
const default_port = 80;
const requests = {};

const log = (message) => {

  if(!message) return;

  if (typeof message == 'object')
    console.log(`[hook-server] ${JSON.parse(message)}`);
  else if(typeof message == 'string')
    console.log(`[hook-server] ${message}`);
  else
    console.log('[hook-server] Error');
};

const isEmptyObject = (obj) => !Object.keys(obj).length;

const HookServer = ( () => {
  let same;

  const _objectToQuerystring = (obj) => {
    return Object.keys(obj).reduce((str, key, i) => {
      let delimiter, val;
      delimiter = (i === 0) ? '?' : '&';
      key = encodeURIComponent(key);
      val = encodeURIComponent(obj[key]);
      return [str, delimiter, key, '=', val].join('');
    }, '');
  };

  const _capture = (req) => {
    let message;

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
        : req.rawBody);
  };

  const _toHandler = (url, method, call) => {
    log(`service.${url}`);

    const cap = (req, res) => {
      _capture(req);
      call(req, res);
      res.end();
    };

    handlers[method + url] = handler.create(cap);
    handlers[method + url].method = method;
  };

  const _missing = (req) => {
    let url = Url.parse(req.url, true);
    return handler.create((req, res) => {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write(`404 not found to${url.pathname}`);
      res.end();
    });
  };

  const _setRoute = (req) => {
    url = Url.parse(req.url, true);
    let handler = handlers[req.method + url.pathname];

    if (!handler)
      handler = _missing(req)
      else if(handler.method != req.method)
        handler = _missing(req)

    return handler;
  };

  const _generateRequest = (lnk) => {
    return post = (data) => {

      //var post_data = _objectToQuerystring(data);
      data = data ? data : {};

      const url = Url.parse(lnk);

      const options = {
        host: url.hostname,
          path: url.pathname,
          port: url.port,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer token",
          }
      };

      const req = http.request(options, res => {
          let responseString = "";

          res.on("data", data => {
              responseString += data;
          });

          res.on("end", () => {
              // responseString
              console.log('end trigger sending');
          });
      });

      req.write(JSON.stringify(data));
      req.end();
    }
  };

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

      this.filter(this.__route ? this.__route : def, (req, res) => {
        log("Request received on api")
      });

      const server = http.createServer((req, res) => {
        const handler = _setRoute(req);
        handler.process(req, res);
      });

      server.listen(this.port, err => {
        if(err) throw new TypeError(err.message);

        console.log(`[hook-server] is started on ${port}`);
        callback()
      });
    }

    create(name, url) {
      if (typeof name !== 'string') throw new TypeError('trigger name not is string')
      if (typeof url !== 'string') throw new TypeError('url not is string')
      //if (typeof call !== 'function') throw new TypeError('callback not is one function')

      try {
        if (same.trigger[name]) {
          log(`${name} trigger already exists`);
        } else {
          same.trigger[name] = url;
          requests[name] = _generateRequest(url);
          log(`trigger.${name}`);
        }
      } catch (e) {
        log(`error on create trigger: ${e.message}`);
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
          log(`${action} already exists`);
        } else {
          same.receiver[action] = call;
          log(`name.${action}`);
        }
      } catch (e) {
        log(`error on add action: ${e.message}`);
      }

      return this;
    }
  }

  const hook = new HookServer();

  return hook;
})();

module.exports = HookServer;
