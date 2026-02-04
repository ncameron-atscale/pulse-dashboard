const axios = require('axios');
const yaml = require('js-yaml');
const fs = require('fs');
const xml2js = require('xml2js');
// const { create } = require('xmlbuilder2');

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});


const { program } = require('commander');
const { log } = require('console');

var logger;



// --- Lookups ---
const aggTypeLookup = {
    1: "sum", 5: "avg", 4: "max", 3: "min", 8: "count",
    1000: "count", 2: "count", 7: "std", 333: "std",
    0: "var", 6: "var", 9: "calculated"
};

const dataTypeLookup = {
    0: "EMPTY", 16: "INT1", 2: "INT2", 3: "INT4", 20: "INT8",
    17: "INT_UNSIGNED1", 18: "INT_UNSIGNED2", 19: "INT_UNSIGNED4",
    21: "INT_UNSIGNED8", 4: "FLOAT32", 5: "FLOAT64", 6: "CURRENCY",
    7: "DATE_DOUBLE", 8: "BSTR", 11: "BOOL", 14: "DECIMAL",
    72: "GUID", 128: "BYTES", 129: "STRING", 130: "WSTR",
    131: "NUMERIC", 133: "DATE", 134: "TIME", 135: "DATETIME"
};

/**
 * Gets the Bearer Token from AtScale
 */
async function getToken(installer, atscaleUrl, organizationId, username, password) {
    try {
        if (installer) {
            const url = `${atscaleUrl}:10500/${organizationId}/auth`;
            logger.debug("Auth URL: %s", url);

            const response = await axios.get(url, {
                auth: { username, password }
            });
            return response.data;
        } else {
            const url = `${atscaleUrl}/auth/realms/atscale/protocol/openid-connect/token`;
            logger.debug("Auth URL: %s", url);

            const params = new URLSearchParams();
            params.append('client_id', 'atscale-ai-link');
            params.append('grant_type', 'password');
            params.append('username', username);
            params.append('password', password);

            const response = await axios.post(url, params);
            return response.data.access_token;
        }
    } catch (error) {
        console.error("Authentication failed:", error.message);
        throw error;
    }
}

/**
 * Executes a DMV Query via XMLA
 */
async function getDmvData(token, installer, atscaleUrl, statement, organizationId, catalogName, modelName) {
    logger.debug("XMLA Request Data: %s", atscaleUrl);

    const data = `<?xml version="1.0" encoding="UTF-8"?>
    <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
        <Body>
            <Execute xmlns="urn:schemas-microsoft-com:xml-analysis">
                <Command><Statement>${statement}</Statement></Command>
                <Properties>
                    <PropertyList><Catalog>${catalogName}</Catalog></PropertyList>
                </Properties>
                <Parameters>
                    <Parameter>
                        <Name>CubeName</Name>
                        <Value>${modelName}</Value>
                    </Parameter>
                </Parameters>
            </Execute>
        </Body>
    </Envelope>`;


    const xmlaUrl = installer
        ? `${atscaleUrl}:10502/xmla/${organizationId}`
        : `${atscaleUrl}/engine/xmla`;

    const response = await axios.post(xmlaUrl, data, {
        headers: {
            'Content-Type': 'text/xml',
            'Authorization': `Bearer ${token}`
        }
    });

    // Parse XML response to JSON for easier handling
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const result = await parser.parseStringPromise(response.data);

    // Drill down to the row objects
    // Note: Structure depends on AtScale SOAP response, usually under Body -> ExecuteResponse -> return -> root -> row
    try {
        const rows = result['soap:Envelope']['soap:Body']['ExecuteResponse']['return']['root']['row'];
        return Array.isArray(rows) ? rows : [rows];
    } catch (e) {
        return [];
    }
}

/**
 * Retrieves Metrics
 */
async function getMetrics(token, installer, atscaleUrl, organizationId, catalogName, modelName) {
    const statement = "SELECT MEASURE_NAME, DATA_TYPE, MEASURE_CAPTION, MEASURE_AGGREGATOR, MEASURE_DISPLAY_FOLDER, DEFAULT_FORMAT_STRING, DESCRIPTION FROM $system.MDSCHEMA_MEASURES WHERE [CUBE_NAME] = @CubeName";
    const rows = await getDmvData(token, installer, atscaleUrl, statement, organizationId, catalogName, modelName);

    logger.debug("Metric Rows: %s", rows);
    logger.debug("Metric Row Count: %s %s", catalogName, modelName);
    return rows?rows.map(row => {
        if (!row) return null;
        let aggType = parseInt(row.MEASURE_AGGREGATOR);
        if (aggType === 9) aggType = 1;

        return {
            query_name: row.MEASURE_NAME,
            caption: row.MEASURE_CAPTION,
            agg_type: aggType,
            agg_type_string: aggTypeLookup[aggType] || "unknown",
            format_string: row.DEFAULT_FORMAT_STRING || "",
            description: row.DESCRIPTION || "",
            data_type: parseInt(row.DATA_TYPE),
            data_type_string: dataTypeLookup[parseInt(row.DATA_TYPE)] || "unknown",
            folder: row.MEASURE_DISPLAY_FOLDER || ""
        };
    }):[];
}

/**
 * Retrieves Attributes and Hierarchies
 */
async function getAttributes(token, installer, atscaleUrl, organizationId, catalogName, modelName) {
    const levelStatement = "SELECT LEVEL_NAME, HIERARCHY_UNIQUE_NAME, LEVEL_NUMBER, LEVEL_CAPTION, DESCRIPTION, LEVEL_DBTYPE FROM $system.MDSCHEMA_LEVELS WHERE [CUBE_NAME] = @CubeName and [LEVEL_NAME] &lt;&gt; '(All)' and [DIMENSION_UNIQUE_NAME] &lt;&gt; '[Measures]'";
    const hierStatement = "SELECT HIERARCHY_UNIQUE_NAME, HIERARCHY_DISPLAY_FOLDER FROM $system.MDSCHEMA_HIERARCHIES WHERE [CUBE_NAME] = @CubeName";

    const [levelRows, hierRows] = await Promise.all([
        getDmvData(token, installer, atscaleUrl, levelStatement, organizationId, catalogName, modelName),
        getDmvData(token, installer, atscaleUrl, hierStatement, organizationId, catalogName, modelName)
    ]);

    const folderLookup = {};
    hierRows.forEach(row => {
        if (!row) return null;
        folderLookup[row.HIERARCHY_UNIQUE_NAME] = row.HIERARCHY_DISPLAY_FOLDER || "";
    });

    const attributes = {};

    levelRows.forEach(row => {
        if (!row) return;
        const hUniqueName = row.HIERARCHY_UNIQUE_NAME;
        const folder = folderLookup[hUniqueName] || "";

        // Extract Dimension and Hierarchy names from [Dim].[Hier] format
        const parts = hUniqueName.match(/\[(.*?)\]\.\[(.*?)\]/);
        const dimensionName = parts ? parts[1] : hUniqueName;
        const hierarchyName = parts ? parts[2] : hUniqueName;

        const level = {
            query_name: row.LEVEL_NAME,
            caption: row.LEVEL_CAPTION,
            level_number: parseInt(row.LEVEL_NUMBER),
            description: row.DESCRIPTION || "",
            //            data_type: parseInt(row.LEVEL_DBTYPE || 130),
            data_type_string: dataTypeLookup[parseInt(row.LEVEL_DBTYPE || 130)],
            folder: folder
        };

        if (!attributes[dimensionName]) attributes[dimensionName] = {};
        if (!attributes[dimensionName][hierarchyName]) attributes[dimensionName][hierarchyName] = [];

        attributes[dimensionName][hierarchyName].push(level);
    });

    return attributes;
}


function convertToSQL(tableName, mdxObjects) {
    sqlObjects = {};
    mdxObjects.metrics.forEach(objType => {
        if (!objType) return;
        sqlObjects[objType.query_name] = {};
        sqlObjects[objType.query_name]["alias"] = false;
        sqlObjects[objType.query_name]["name"] = objType.query_name;
        sqlObjects[objType.query_name]["data_type"] = objType.data_type_string;
        sqlObjects[objType.query_name]["label"] = objType.caption;
        sqlObjects[objType.query_name]["description"] = objType.description;
        sqlObjects[objType.query_name]["role"] = "measure";
        sqlObjects[objType.query_name]["type"] = "quantitative";
        sqlObjects[objType.query_name]["aggregation"] = objType.agg_type_string;
        sqlObjects[objType.query_name]["folder"] = objType.folder;
    })
    Object.keys(mdxObjects.attributes).forEach(objType => {
        // console.log("ATTRIBUTE TYPE:", objType);
        // console.log(mdxObjects.attributes[objType]);
    })
    return { table_name: tableName, columns: sqlObjects };
}

/**
 * Main Execution
 */
async function run() {
    try {

        program
            .description('Generate the local model definition from AtScale')
            .option('-l, --logfile <path>', 'Path to log file.', undefined)
            .option('-f, --connectionFile <path>', 'Path to connections YAML file', 'connections.yaml')
            .option('-c, --connection <path>', 'Connection name from the connections file or \'default\' if not specified', 'default')
            .option('-o, --output <path>', 'Path to the output or empty for stdout', undefined)
            .option('-v, --verbose', 'Verbose logging', undefined)
            .requiredOption('-m, --model <string>', 'Name of the model');

        program.parse();

        const options = program.opts();
        // if (!options.output && !options.logfile) {
        //     console.error("Either --output or --logfile must be specified to avoid console spamming.");
        //     process.exit(1);
        // }

        logger = createLogger({
            level: 'info', // Minimum log level to record
            format: combine(
                format.splat(),
                timestamp(),
                logFormat
            ),
            transports: [
                // Log to the console or a file
                options.logfile ? new transports.File({ filename: options.logfile, level: options.verbose ? 'debug' : 'info' }) :
                    new transports.Console({ level: options.verbose ? 'debug' : 'info' })
            ],
        });

        logger.info("Reading connection file %s", options.connectionFile);
        var connectionFile = yaml.load(fs.readFileSync(options.connectionFile, 'utf8'));

        logger.info("Authenticating against connection named %s", options.connection);
        logger.debug("Connection detail: %s", connectionFile.connections[options.connection]);

        var connection = connectionFile.connections[options.connection];
        var user = connectionFile.users[connection.mdx.user] || {};
        logger.debug("User detail: %s", user);
        const token = await getToken(connection.installer,
            connection.mdx.url,
            connection.mdx.organization_id, user.username, user.password);


        logger.info("Fetching Metrics...");
        const metrics = await getMetrics(token, connection.installer,
            connection.mdx.url,
            connection.mdx.organization_id,
            connection.mdx.catalog_name,
            options.model);

        logger.info("Fetching Attributes...");
        const attributes = await getAttributes(token, connection.installer,
            connection.mdx.url,
            connection.mdx.organization_id,
            connection.mdx.catalog_name,
            options.model);

        const output = { metrics, attributes };

        var models = {};
        models[options.model] = {};
        models[options.model]["data_source"] = options.connection;
        models[options.model]["mdx"] = output;
        models[options.model]["sql"] = convertToSQL(connection.sql.schema, output);

        // console.log(yaml.dump(models, { noRefs: true, quotingType: '"' }));


        outputLogger = createLogger({
            format: printf(({ level, message, label, timestamp }) => {
                return `${message}`;
            }),
            transports: [
                // Log to the console or a file
                options.output ? new transports.File({ filename: options.output }) :
                    new transports.Console()
            ],
        });

        outputLogger.log('info', yaml.dump(models, { noRefs: true, quotingType: '"' }));

        logger.info(`Success! Generated model definition for model '${options.model}'.`);
    } catch (error) {
        logger.error("Execution failed:", error);
    }
}

run();

// rm generated.out.yaml || clear && node src/app/generate.js -m "Telemetry" -v -c ats_connection -o model.yaml