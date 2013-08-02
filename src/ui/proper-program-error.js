function properProgramError(err) {
  var msg = 'An error occurred loading your '+
            '<a href="'+err.filename+'" target="_new">program</a> '+
            'on line <b>'+err.lineno+'</b>:<br/>'+
            '<pre><code>'+err.message+'</code></pre>';

  return msg;
}

module.exports = properProgramError;

/*

    Sample error

{
  "lineno":67,
  "filename":"blob:http%3A//localhost%3A8081/143843ab-b3c9-4c28-aee9-f7b375cdf03c",
  "message":"Uncaught SyntaxError: Unexpected identifier",
  "cancelBubble":false,
  "returnValue":true,
  "srcElement":{},
  "defaultPrevented":false,
  "timeStamp":1375454781214,
  "cancelable":true,
  "bubbles":false,
  "eventPhase":2,
  "currentTarget":{},
  "target":{},
  "type":"error"
}
*/
