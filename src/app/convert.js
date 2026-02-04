const templateFunctions = require('../../templates/functions');
console.log("Functions loaded:", templateFunctions);

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

var models = {};
try {
    const yamlString = fs.readFileSync(process.argv[4], 'utf8');
    models = yaml.load(yamlString);
} catch (err) {
    console.error("Error reading or parsing file:", err);
}

var templateRoot = __dirname + "/../../templates";
var templatePath = templateRoot + "/"+process.argv[3] ;
try {
    template = fs.readFileSync(templatePath, 'utf8');
} catch (err) {
    console.error("Error reading or parsing file:", err);
}

var paths = { projectRoot: __dirname + "/../../",
              templateRoot:templateRoot,
              template: templatePath };

console.log("Paths:", paths);

let output = ejs.render(template, {functions: templateFunctions, paths, visuals:definition, models, crypto,
      ref: {functions: templateFunctions, paths, visuals:definition, models, crypto, fs, ejs}
} );
fs.writeFile(process.argv[5], output, err => {
  if (err) {
    console.error('Error writing file:', err);
  } else {
    console.log('File written successfully!');
  }
});