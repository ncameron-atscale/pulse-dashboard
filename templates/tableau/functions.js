import test from "node:test";

export default {
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
            }
        return typeMap[typeName] || "unknown";
    }
}