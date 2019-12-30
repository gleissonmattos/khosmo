/*!
 * khosmo
 * Copyright(c) 2018 Gleisson Mattos
 * http://github.com/gleissonmattos
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 */

/**
* Module exports
*/
exports.create = fn => new HookHandler(fn);


/**
* Get query request params
*
* @param {Object} req - server request
* @return {Object} JSON object with querys parameters
* @private
*/
const getQueryParams = req => {
  const q = req.url.split("?");
  result = {};
  if(q.length >= 2){
    q[1].split("&").forEach((item) => {
      const [field, value] = item.split("=");
      try {
        result[field] = value;
      } catch (e) {
        result[field] = "";
      }
    })
  }
  return result;
};


/**
* Get JSON from from URI param
*
* @param {String} data
* @return {Object} JSON object parameter
* @private
*/
const getObjFromUri = (data) => {
  const uri = decodeURI(data);
  const chunks = uri.split("&");
  const params = Object();

  for (let i=0; i < chunks.length ; i++) {
    const chunk = chunks[i].split("=");
    if(chunk[0].search("\\[\\]") !== -1) {
      if( typeof params[chunk[0]] === "undefined" ) {
        params[chunk[0]] = [chunk[1]];
      } else {
        params[chunk[0]].push(chunk[1]);
      }
    } else {
      params[chunk[0]] = chunk[1];
    }
  }

  return params;
};

/**
* HookHandler class
* @constructor
* @param emt - handler emitter
*/
class HookHandler {

  constructor(emt) {
    this.emt = emt;
  }

  /**
  * Process request data
  *
  * @param {Khosmo} instance - Khosmo instance class
  * @param {Object} req - request object from server
  * @param {Object} res - response object from server
  * @public
  */
  process(instance, req, res) {
    let body = "";

    req.query = getQueryParams(req);

    req.on("data", (chunk) => {
      body += chunk.toString("utf8");
    }).on("end", () => {
      try {
        req.rawBody = JSON.parse(body);
        req.body = {};
      } catch (err) {
        req.rawBody = body;
        req.body = getObjFromUri(body);
      }
      this.emt.apply(this, [instance, req, res]);
    });
  }
}
