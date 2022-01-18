var { PythonShell } = require('python-shell');

function runPythonFile(pythonFile, args) {
    return new Promise((resolve, reject) => {
        try {
            PythonShell.run(pythonFile, { mode: 'text' }, function (err, results) {
                if (err) {
                    console.log(err);
                }
                console.log(results);
                resolve(String(results).split('result: ')[1]);
            });
        } catch {
            console.log('error running python code');
            reject();
        }
    });
}

(async () => {
    let result = await runPythonFile('./DuplicationDetection/main.py', [
        `./images/1c707d14be465ca9568a6a1dc0613745.jpg`,
        `./images/01d064ea5e7433ca393a3ee658730d39.jpg`,
    ]);

    console.log(result);
})();
