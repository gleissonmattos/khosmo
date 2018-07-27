exports.create = (fn) => {
  return new HookHandler(fn);
}

var getQueryParams = (req) => {
  let q = req.url.split('?'), result={};
  if(q.length>=2){
    q[1].split('&').forEach( (item) => {
      try {
        result[item.split('=')[0]]=item.split('=')[1];
      } catch (e) {
        result[item.split('=')[0]]='';
      }
    })
  }
  return result;
}

var getObjFromUri = (uri) => {
  var uri = decodeURI(uri);
  var chunks = uri.split('&');
  var params = Object();

  for (var i=0; i < chunks.length ; i++) {
    var chunk = chunks[i].split('=');
    if(chunk[0].search("\\[\\]") !== -1) {
      if( typeof params[chunk[0]] === 'undefined' ) {
        params[chunk[0]] = [chunk[1]];
      } else {
        params[chunk[0]].push(chunk[1]);
      }
    } else {
      params[chunk[0]] = chunk[1];
    }
  }

  return params;
}

HookHandler = function (emt) {
  this.process = (req, res) => {
    var body = '';

    req.query = getQueryParams(req);

    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
    }).on('end', () => {
      try {
        req.rawBody = JSON.parse(body);
        req.body = {};
      } catch (err) {
        req.rawBody = body;
        req.body = getObjFromUri(body);
      }
      emt.apply(this, [req, res]);
    });
  }
}
