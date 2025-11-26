const tableau = require('../../templates/tableau/functions');
console.log("Tableau functions loaded:", tableau);

let ejs = require('ejs');
let fs = require('fs');
let yaml = require('js-yaml');
const crypto = require('crypto');

var definition = {};
try {
    const yamlString = fs.readFileSync(process.argv[2], 'utf8');
    definition = yaml.load(yamlString);
} catch (err) {
    console.error("Error reading or parsing file:", err);
}
// console.log("Definition loaded:", definition);

var template = "";
try {
    template = fs.readFileSync(process.argv[3], 'utf8');
} catch (err) {
    console.error("Error reading or parsing file:", err);
}

var paths = { projectRoot: __dirname + "/../../",
              templateRoot: __dirname + "/../../"+process.argv[3]+"/.." };

console.log("Paths:", paths);

let output = ejs.render(template, {functions: {tableau}, paths, visuals:definition, models: definition.models, crypto} );
fs.writeFile(process.argv[4], output, err => {
  if (err) {
    console.error('Error writing file:', err);
  } else {
    console.log('File written successfully!');
  }
});