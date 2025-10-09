let ejs = require('ejs');
let fs = require('fs');

var definition = {};
try {
    const jsonString = fs.readFileSync(process.argv[2], 'utf8');
    definition = JSON.parse(jsonString);
} catch (err) {
    console.error("Error reading or parsing file:", err);
}

var template = "";
try {
    template = fs.readFileSync(process.argv[3], 'utf8');
} catch (err) {
    console.error("Error reading or parsing file:", err);
}

let output = ejs.render(template, {definition} );
console.log(output);
