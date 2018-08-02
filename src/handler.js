exports.create = (fn) => {
  return new HookHandler(fn);
}

const getQueryParams = (req) => {
  const q = req.url.split('?'), result={};
  if(q.length>=2){
    q[1].split('&').forEach((item) => {
      try {
        result[item.split('=')[0]] = item.split('=')[1];
      } catch (e) {
        result[item.split('=')[0]] = '';
      }
    })
  }
  return result;
};

const getObjFromUri = (data) => {
  const uri = decodeURI(data);
  const chunks = uri.split('&');
  const params = Object();

  for (let i=0; i < chunks.length ; i++) {
    const chunk = chunks[i].split('=');
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
};

class HookHandler {

  constructor(emt) {
    this.emt = emt;
  }

  process(req, res) {
    let body = '';

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
      this.emt.apply(this, [req, res]);
    });
  }
}
