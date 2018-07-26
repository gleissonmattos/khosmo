var log = (message) => {

  if(!message) return;

  if (typeof message == 'object')
    console.log('[hook-server] ' + JSON.parse(message));
  else if(typeof message == 'string')
    console.log('[hook-server] ' + message);
  else
    console.log('[hook-server] Error');
}

var HookServer = (function() {
  var same;

  var _teste = (value) => {
    same.obj[value[same.action]](value);

    if(same.interceptor)
      same.interceptor(value);
  }

  class HookServer {
    constructor(opts) {
      this.obj = {};
      this.interceptor;

      same = this;
    }

    option(opt) {
      if (typeof opt !== 'object') throw new TypeError('Expected an Object')

      this.action = opt.action;
      this.actions = opt.actions;
    }

    init() {
      setTimeout(function(){
        _teste({ action : "action_one", v : 1, teste : "this is string value from test"});
      }, 3000)
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
          log("action add: " + action);
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

var hook = HookServer;

hook.option({
  action : 'action'
});

hook.all(function(message){
  console.log("all executed");
}).on("action_one", function(message){
  console.log("this received message: " + JSON.stringify(message));
})

hook.on("action_two", function(message){
  console.log("this received message: " + JSON.stringify(message));
});

hook.on("action_three", function(message){
  console.log(message);
});

hook.init();
