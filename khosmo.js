const http = require('http');

const handler = require('./src/handler');
const fs = require('fs');
const Url = require('url');
const handlers = {};
const def = '/';
let method = {
  POST : 'POST',
  GET : 'GET',
  UPDATE : 'UPDATE',
  DELETE : 'DELETE'
};
const default_port = 80;
const requests = {};
const default_headers = { "Content-Type": "application/json" }
const Khosmo = ( () => {

  let same;
  let _id = 'khosmo';

  const _isEmptyObject = (obj) => !Object.keys(obj).length;

  const log = (message) => {

    if(!message || !same.debug) return;

    if (typeof message == 'object')
      console.log(`[${_id}] ${JSON.parse(message)}`);
    else if(typeof message == 'string')
      console.log(`[${_id}] ${message}`);
    else
      console.log(`[${_id}] Error`);
  };

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
        ? (_isEmptyObject(message) ? req.rawBody : message)
        : req.rawBody);
  };

  const _toHandler = (url, call) => {
    log(`service.${url}`);

    const cap = (req, res) => {
      _capture(req);
      call(req, res);
      res.end();
    };

    handlers[method.POST + url] = handler.create(cap);
    handlers[method.POST + url].method = call;
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

    return handler;
  };

  const _generateRequest = (lnk) => {
    return post = (data, headers) => {

      //var post_data = _objectToQuerystring(data);
      data = data ? data : {};

      if(headers) {
        if (typeof headers !== 'object') throw new TypeError('Option expected an Object')
        headers = Object.assign({}, default_headers, headers)
      } else headers = default_headers

      const url = Url.parse(lnk);

      const options = {
        host: url.hostname,
          path: url.pathname,
          port: url.port,
          method: method.POST,
          headers: headers
      }

      const req = http.request(options, res => {
          let responseString = "";

          res.on("data", data => {
              responseString += data;
          });

          res.on("end", () => {
              // responseString
              log('Send finish');
          });
      });

      req.write(JSON.stringify(data));
      req.end();
    }
  };

  class Khosmo {

    constructor(opts) {
      this.receiver = {};
      this.trigger = {};
      this.interceptor;
      this.action;

      same = this;
    }

    route(url, call) {
      _toHandler(url, call);
    }

    config(opt) {
      if (typeof opt !== 'object') throw new TypeError('Option expected an Object')

      try {
        this.parser = typeof opt.parser !== 'boolean' ? true : opt.parse;
        this.debug = typeof opt.debug !== 'boolean' ? false : opt.debug;
      } catch(err){
        throw new TypeError(err.message);
      }

      this.action = opt.action;
      this.__route = opt.route;
    }

    listen(port, callback) {
      this.port = port ? port : default_port;

      this.route(this.__route ? this.__route : def, (req, res) => {
        log("Request received on api")
      });

      const server = http.createServer((req, res) => {
        const handler = _setRoute(req);
        handler.process(req, res);
      });

      server.listen(this.port, err => {
        callback(err)
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

    send(name, data, headers) {
      if (typeof name !== 'string') throw new TypeError('url not is string')
      //if (typeof data !== 'object') throw new TypeError('callback not is one function')
      requests[name](data, headers);
    }

    all(call) {
      if (typeof call !== 'function') throw new TypeError('callback not is one function')
      this.interceptor = call;

      return this;
    }

    filter(action, call) {
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

    observe(dir, callback, opt) {
      if (typeof dir !== 'string') throw new TypeError('directory is required')
      if (typeof callback !== 'function') throw new TypeError('callback not is one function')

      opt = opt ? opt : {};

      fs.watch(dir, function (event, filename) {
          if (filename) {
            if(opt.get_data) {
              fs.readFile(filename, function(err, data) {
                if(err) return;

                callback(filename, event, data.toString());
              });
            } else {
              callback(filename, event);
            }
          } else {
              console.log('filename not provided');
          }
      });
    }
  }
  return new Khosmo();
})();

module.exports = Khosmo;
