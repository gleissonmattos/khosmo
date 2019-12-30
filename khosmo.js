/*!
 * khosmo
 * Copyright(c) 2018 Gleisson Mattos
 * http://github.com/gleissonmattos
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 */

const http = require("http");

const handler = require("./src/handler");
const fs = require("fs");
const Url = require("url");
const handlers = {};
const def = "/";
let method = {
  POST : "POST",
  GET : "GET",
  UPDATE : "UPDATE",
  DELETE : "DELETE"
};
const default_port = 80;
const requests = {};
const default_headers = {
  "Content-Type": "application/json"
};

const Khosmo = (() => {

  let same;
  let _id = "khosmo";


  /**
  * Check if object `obj` not contains keys.
  *
  * @param {Object} obj
  * @return {boolean}
  * @private
  */
  const _isEmptyObject = obj => !Object.keys(obj).length;


  /**
  * Basic debug log system.
  *
  * @param {String|Object} message
  * @private
  */
  const log = (message) => {
    // Prevent and check debug mode
    if(!message || !same.debug) return;

    if (typeof message == "object")
      console.info(`[${_id}] ${JSON.parse(message)}`);
    else if(typeof message == "string")
      console.info(`[${_id}] ${message}`);
    else
      console.error(`[${_id}] Error`);
  };


  /**
  * Convert JSON Object to query string
  *
  * @param {Object} obj
  * @return {String}
  * @private
  */
  const _objectToQuerystring = obj => {
    return Object.keys(obj).reduce((str, key, i) => {
      let delimiter, val;
      delimiter = (i === 0) ? "?" : "&";
      key = encodeURIComponent(key);
      val = encodeURIComponent(obj[key]);
      return [str, delimiter, key, "=", val].join("");
    }, "");
  };


  /**
  * Capture message request and directs
  * to registered data receivers
  *
  * @param {Object} req - request object server
  * @private
  */
  const _capture = req => {
    let message;

    if (typeof req.rawBody == "object") {
      message = req.rawBody;
    } else if (typeof req.body == "object") {
      message = req.body;
    }

    try {
      same.receiver[message[same.action]](message);
    } catch(e) {
      throw new Error();
    }

    if(same.interceptor)
      same.interceptor(same.parser
        ? (_isEmptyObject(message) ? req.rawBody : message)
        : req.rawBody);
  };

  /**
  * Register router service and url handler paths
  *
  * @param {Object} req - request object server
  * @private
  */
  const _toHandler = (url, call) => {
    log(`service.${url}`);
    const cap = (instance, req, res) => {
      let message;
      _capture(req);

      if (typeof req.rawBody == "object") {
        message = req.rawBody;
      } else if(typeof req.body == "object") {
        message = req.body;
      }

      call(
        instance.parser
          ? (_isEmptyObject(message) ? req.rawBody : message)
          : req.rawBody,
        req, res
      );

      res.end();
    };
    handlers[`${method.POST}${url}`] = handler.create(cap);
    handlers[`${method.POST}${url}`].method = call;z
  };

  /**
  * Directs the request when there is no
  * adequate response
  *
  * @param {Object} req - request object server
  * @private
  */
  const _missing = (req) => {
    let url = Url.parse(req.url, true);
    return handler.create((instance, req, res) => {
      res.writeHead(404, {"Content-Type": "text/plain"});
      res.write(`404 not found to${url.pathname}`);
      res.end();
    });
  };

  /**
  * Check requests and directs
  *
  * @param {Object} req - request object server
  * @return {Object} - handler object
  * @private
  */
  const _checkRequest = (req) => {
    url = Url.parse(req.url, true);
    let handler = handlers[req.method + url.pathname];

    if (!handler)
      handler = _missing(req)

    return handler;
  };

  /**
  * Generate post request sender
  *
  * @param {String} lnk - url to post request
  * @return {Function} - event
  * @private
  */
  const _generateRequest = (lnk) => {
    return post = (data, headers) => {

      //var post_data = _objectToQuerystring(data);
      data = data || {};

      if(headers) {
        if (typeof headers !== "object") {
          throw new TypeError("Option expected an Object")
        }
        headers = {
          ...default_headers,
          ...headers
        };
      } else headers = default_headers

      const {
        hostname: host,
        pathname: path,
        port
      } = Url.parse(lnk);

      const options = {
          host,
          path,
          port,
          method: method.POST,
          headers
      }

      const req = http.request(options, res => {
          let responseString = "";

          res.on("data", data => {
              responseString += data;
          });

          res.on("end", () => {
              log("Send finish");
          });
      });

      req.write(JSON.stringify(data));
      req.end();
    }
  };


  /**
  * Khosmo class
  * @constructor
  */
  class Khosmo {

    constructor() {
      this.receiver = {};
      this.trigger = {};
      this.interceptor;
      this.action;

      same = this;
    }

    /**
    * Create HTTP route handler
    *
    * Register url route and event callback request receiver.
    * Todas as rotas atualmente serão mapeadas para receber
    * apenas solicitações de métodos post
    *
    * Examples:
    *
    *     khosmo.route("/receiver/posts", (message, req, res) => {
    *       // Callback here. `message` is captured body request
    *     });
    *
    * @param {String} url - route path
    * @param {Function} call - route request callback
    * @public
    */
    route(url, call) {
      _toHandler(url, call);
    }


    /**
    * Khosmo configurator
    *
    * All options são
    *
    * Examples:
    *
    *     khosmo.config({
    *       action : "action_check_key",
    *       parser : true,
    *       route : "/",
    *       debug : false
    *     })
    *
    * @param {object} opt - JSON Object with options
    * @public
    */
    config(opt) {
      if (typeof opt !== "object") throw new TypeError("Option expected an Object")

      try {
        this.parser = typeof opt.parser !== "boolean" ? true : opt.parser;
        this.debug = typeof opt.debug !== "boolean" ? false : opt.debug;
      } catch(err){
        throw new TypeError(err.message);
      }

      this.action = opt.action;
      this.__route = opt.route;
    }


    /**
    * Server start listener
    *
    * Started the HTTP server with specifications
    *
    * @param {Number} port - port the service
    * @param {Function} call - callback
    * @public
    */
    listen(port, call) {
      const instance = this;
      this.port = port || default_port;

      this.route(this.__route || def, (req, res) => {
        log("Request received on api");
      });

      const server = http.createServer((req, res) => {
        const handler = _checkRequest(req);
        handler.process(instance, req, res);
      });

      server.listen(this.port, err => {
        call(err)
      });
    }


    /**
    * Register one webhook trigger emitter
    *
    * These emitters can be triggered using
    * the send method `khosmo.send()`.
    *
    * Examples:
    *
    *     khosmo.create("payment_finish", "http://localhost:8000/report");
    *     khosmo.create("user_registered", "http://localhost:8000/users");
    *
    * @param {String} name - webhook name
    * @param {String} url - HTTP url to receiver get_data
    * @return {Instance} chaining
    * @public
    */
    create(name, url) {
      if (typeof name !== "string") throw new TypeError("trigger name not is string")
      if (typeof url !== "string") throw new TypeError("url not is string")

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


    /**
    * Fires the webhook configured in `khosmo.create()`
    *
    * Examples:
    *
    *     khosmo.send("payment_finish", "One payment has acconpliceded");
    *     khosmo.send("user_registered", { id: 5641, name : "Pedro"});
    *
    *     // using headers
    *     khosmo.send("user_registered", "This data here",{
    *       "Content-Type": "application/json",
    *       "Authorization": "Bearer ASDflkaskldjfljlewrqwasf",
    *     })
    *
    * @param {String} name - webhook name
    * @param {Object|String} data - data to send
    * @param {Object} headers - object with headers values
    * @public
    */
    send(name, data, headers) {
      if (typeof name !== "string") throw new TypeError("url not is string")
      requests[name](data, headers);
    }


    /**
    * Configure method to receiver all
    * data messages request
    *
    * Examples:
    *
    *     khosmo.all("payment_finish", (message) => {
    *       // messages receiveds. `message` is captured message
    *     });
    *
    *
    * @param {Function} call - callback to receiver all data messages
    * @return {Instance} chaining
    * @public
    */
    all(call) {
      if (typeof call !== "function") throw new TypeError("callback not is one function")
      this.interceptor = call;

      return this;
    }


    /**
    * Filters messages data
    *
    * The filter is made through keys contained in json
    * objects received in the body of the request. This JSON key
    * is configured in `khosmo.config()` using the `action` option
    *
    * Examples:
    *
    *     khosmo.filter("action_name", (message) => {
    *       // messages receiveds. `message` is captured message
    *     });
    *
    *
    * @param {String} action
    * @param {Function} call - callback
    * @return {Instance} chaining
    * @public
    */
    filter(action, call) {
      if (typeof action !== "string") throw new TypeError("action is required")
      if (typeof call !== "function") throw new TypeError("callback not is one function")

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


    /**
    * File monitor
    *
    * Identify changed status in files into in path or one
    * specific file
    *
    * Examples:
    *
    *     khosmo.observe("./my_files/example.yml", (filename, action, data) => {
    *       // your code here
    *     }, { get_data: true});
    *
    *
    * @param {String} dir - file(s) directory
    * @param {Function} callback
    * @param {Object} opt - options
    * @return {Instance}
    * @public
    */
    observe(dir, callback, opt) {
      if (typeof dir !== "string") throw new TypeError("directory is required")
      if (typeof callback !== "function") throw new TypeError("callback not is one function")

      opt = opt || {};

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
              console.log("filename not provided");
          }
      });
    }
  }
  return new Khosmo();
})();

module.exports = Khosmo;
