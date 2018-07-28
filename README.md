hook-server
===========================

This module allows you to easily implement a webhook service. They rely on the pre-configuration of triggers that when triggered send notifications and share data in real time. This module also has a built-in server for implementing a webhook receiving API.

## Get started

Install module in your project

```sh
npm install --save hook-server
```

## Basic usage
Start module:
```js
var hook = require('hook-server');
```
Create web hook triggers to one http data receptor:
```js
// hook one
hook.create("hook_post",
  "http://localhost:8000/hook_posts"
);
// hook two
hook.create("error",
  "http://localhost:8000/error/log"
);
```

To trigger a hook call it by passing the data you want to send:
```js
hook.send("hook_post", {name : 'Pedro José', msg : 'Hello hook'});
```
You can also notify with a simple text, exemplo:
```js
hook.send("hook_post", "This is one message");
```

Send notification with custom headers using JSON object:

> ```hook.send( [hook_name], [data], [headers])```

```js
hook.send("hook_post", "This is message data", {
  "Content-Type": "application/json",
  "Authorization": "Bearer token_here",
});
```
## Server api
hook-server has an integrated server that can serve as a webhook. This way you can create services to receive data sent from any webhook sender.

Build one basic hook-server receiver:
```js
var hook = require('./main.js');
// Configure
hook.config({
  parser : true,
  route : '/'
});
// Defines a global service for receiving messages
hook.all(function(message){
  console.log("Message captured: " + JSON.stringify(message));
})
```
Start the server with:
```js
hook.start(8000, function(){ /* started success */ });
```

The webhook receiver is started and all messages sent to ```http: // localhost:8000``` will be captured in ```hook.all()```.

>The default service settings are set to: ```hook.config()```. Check all the settings in the options session

#### Filter JSON data

Set data filters for the message receiver. All data sent in JSON will be filtered through a specific, preconfigured key contained in the first level of the object, example:

```js
//  Configure the JSON key to perform the action filter
// 'action_type' is filter custom key
hook.config({
  action : 'action_type',
  parser : true,
  route : '/'
});
// Create one filter to action
hook.filter("payment_finish", function(message){
  console.log("Payment made by: " + message.user_name);
});
```

1. The webhook sends a notification as the template below to be filtered in this action:

```json
{
  "action_type" : "payment_finish",
  "id" : "5ASDFe5w6454asdf64fsa",
  "user_name" : "Richard Peterson",
  "value" : "US$ 486,25"
}
```


#### Server router
You can create a customized http api through the system of routes integrated in the hook-server, example:

```js
hook.router("/receiver/posts", function(message){
  console.log("Message received: " + message);
});
//-
hook.router("/receiver/report", function(message){
  console.log("Report notification: " + message);
});
```

## File observer
Define a file monitor to identify and intercept actions that occur in a particular directory, for example:
```js
hook.observe('./my_files', (fileName, action) => {
  console.log(action + ": " + name);
}, { get_data : false } );
```

> Check params: ```observe( [path], [callback], [options] )```

Now run a hook trigger and notify a service whenever there are changes to any file.

```js
// create one hook trigger
hook.create("file_changed",
  "http://localhost:8000/monitoring/files"
);
// create one file observer definindo ./my_files como diretório de monitoramento
hook.observe('./my_files', (fileName, action, data) => {
  // triggering notification via webhook
  hook.send("file_changed", {
    action : action,
    fileName : fileName,
    fileData : data
  })
}, {
  get_data : true
});
```
## Options
All options configure hook.
```JSON
{
  "action" : "action_check_key",
  "parser" : true,
  "route" : "/"
}
```

| key    | Specifications                                            |
|--------|-----------------------------------------------------------|
| action | String with action key to filter on receiver                  |
| parser | Boolean to convert body request to json (true is default) |
| route  | Default route the receiver api                            |
## Current features

1. Notifications trigger
2. Webhook receptor service filter
3. Api http service
4. File observer
