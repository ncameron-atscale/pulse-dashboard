module.exports = {
    test: function () {
        console.log("Included function called");
        return "Hello included";
    },

    test2: function () {
        console.log("Included function 2 called");
        return "Hello included 2";
    },

    decodeColumnDataType(typeName) {
        const typeMap = {
            "string": "string",
            "integer": "integer",
        };
        return typeMap[typeName] || "unknown";
    },

    renderTemplate: function(templateString, ref) {
        return ref.ejs.render(templateString, {...ref, ref});
    },

    writeTemplate: function(inputPath, ref, outputPath) {
        const templateString = ref.fs.readFileSync(inputPath, 'utf8');
        const output = ref.ejs.render(templateString, {...ref, ref});
        ref.fs.writeFileSync(outputPath, output);
    },

    writeTemplateFromRepo: function(templateName, ref, outputPath) {
        const inputPath = ref.paths.templateRoot + "/" + templateName;
        const templateString = ref.fs.readFileSync(inputPath, 'utf8');
        const output = ref.ejs.render(templateString, {...ref, ref});
        console.log("Writing output to:", outputPath);
        ref.fs.writeFileSync(outputPath, output);
    }
};