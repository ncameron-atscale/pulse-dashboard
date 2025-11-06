let ejs = require('ejs');
let fs = require('fs');
let yaml = require('js-yaml');

var definition = {};
try {
    const yamlString = fs.readFileSync(process.argv[2], 'utf8');
    definition = yaml.load(yamlString);
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
fs.writeFile(process.argv[4], output, err => {
  if (err) {
    console.error('Error writing file:', err);
  } else {
    console.log('File written successfully!');
  }
});