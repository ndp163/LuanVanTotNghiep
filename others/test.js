var { PythonShell } = require('python-shell');

let shell = new PythonShell('funcTest.py', { mode: 'text' });
shell.on('message', function (message) {
    console.log(JSON.parse(message.replace(/'/g, '"')));
});
