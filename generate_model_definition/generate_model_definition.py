import os
import re
import requests
import yaml


atscale_url = ""
installer = True
username = ""
password = ""
organization_id = "default"

catalog_name = "0x5e394884fe8c__00d11e5618314c4b91e963ce5fd10efe__test_project"
model_name = "test_model"

filename = "/Users/johnlynch/Desktop/test_model.yaml"

agg_type_lookup = {
    1: "sum",
    5: "avg",
    4: "max",
    3: "min",
    8: "count",  # destinct count
    1000: "count",  # destinct count estimate; dmv bug, comes back as 8
    2: "count",  # non destinct count
    7: "std",  # std sample
    333: "std",  # std population  # dmv bug, comes back as 0
    0: "var",  # var population
    6: "var",  # var sample
    9: "calculated",
}

data_type_lookup = {
    0: "EMPTY",  # Indicates that no value was specified.
    16: "INT1",  # Indicates a one-byte signed integer.
    2: "INT2",  # Indicates a two-byte signed integer.
    3: "INT4 ",  # Indicates a four-byte signed integer.
    20: "INT8",  # Indicates an eight-byte signed integer.
    17: "INT_UNSIGNED1",  # Indicates a one-byte unsigned integer.
    18: "INT_UNSIGNED2",  # Indicates a two-byte unsigned integer.
    19: "INT_UNSIGNED4",  # Indicates a four-byte unsigned integer.
    21: "INT_UNSIGNED8",  # Indicates an eight-byte unsigned integer.
    4: "FLOAT32",  # Indicates a single-precision floating-point value.
    5: "FLOAT64",  # Indicates a double-precision floating-point value.
    6: "CURRENCY",  # Indicates a currency value. Currency is a fixed-point number with four digits to the right of the decimal point and is stored in an eight-byte signed integer scaled by 10,000.
    7: "DATE_DOUBLE",  # Indicates a date value. Date values are stored as Double, the whole part of which is the number of days since December 30, 1899, and the fractional part of which is the fraction of a day.
    8: "BSTR",  # A pointer to a BSTR, which is a null-terminated character string in which the string length is stored with the string.
    9: "IDISPATCH",  # Indicates a pointer to an IDispatch interface on an OLE object.
    10: "ERROR_CODE",  # Indicates a 32-bit error code.
    11: "BOOL",  # Indicates a Boolean value.
    12: "VARIANT",  # Indicates an Automation variant.
    13: "IUNKNOWN ",  # Indicates a pointer to an IUnknown interface on an OLE object.
    14: "DECIMAL",  # Indicates an exact numeric value with a fixed precision and scale. The scale is between 0 and 28.
    72: "GUID",  # Indicates a GUID.
    128: "BYTES",  # Indicates a binary value.
    129: "STRING",  # Indicates a string value.
    130: "WSTR",  # Indicates a null-terminated Unicode character string.
    131: "NUMERIC",  # Indicates an exact numeric value with a fixed precision and scale. The scale is between 0 and 38.
    132: "UDT",  # Indicates a user-defined variable.
    133: "DATE",  # Indicates a date value (yyyymmdd).
    134: "TIME",  # Indicates a time value (hhmmss).
    135: "DATETIME",  # Indicates a date-time stamp (yyyymmddhhmmss plus a fraction in billionths).
    136: "HCHAPTER",
}


def get_dmv_data(token: str, statement: str) -> list[str]:
    # submit DMV query for the given fields
    headers_dict = {}
    headers_dict["Content-type"] = "application/xml"
    headers_dict["Authorization"] = "Bearer " + token

    data = f"""<?xml version="1.0" encoding="UTF-8"?>
                <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
                    <Body>
                        <Execute xmlns="urn:schemas-microsoft-com:xml-analysis">
                            <Command>
                            <Statement>{statement}</Statement>
                            </Command>
                            <Properties>
                            <PropertyList>
                                <Catalog>{catalog_name}</Catalog>
                            </PropertyList>
                            </Properties>
                            <Parameters xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                            <Parameter>
                                <Name>CubeName</Name>
                                <Value xsi:type="xsd:string">{model_name}</Value>
                            </Parameter>
                            </Parameters>
                        </Execute>
                    </Body>
                </Envelope>"""
    if installer:
        xmla_url = f"{atscale_url}:10502/xmla/{organization_id}"
    else:
        xmla_url = f"{atscale_url}/engine/xmla"
    response = requests.post(xmla_url, headers=headers_dict, verify=False, data=data)
    rows = re.findall("<row>(.*?)</row>", response.text)
    return rows


def get_metrics(token: str) -> list[str]:
    # need to parse the rows to end up with a list of metrics
    statement = "SELECT MEASURE_NAME, DATA_TYPE, MEASURE_CAPTION, MEASURE_AGGREGATOR, MEASURE_DISPLAY_FOLDER, DEFAULT_FORMAT_STRING, DESCRIPTION FROM $system.MDSCHEMA_MEASURES WHERE [CUBE_NAME] = @CubeName"
    rows = get_dmv_data(token, statement)
    metrics = []
    for row in rows:
        try:
            metric_name = re.search("<MEASURE_NAME>(.*?)</MEASURE_NAME>", row)[1]
            folder = re.search("<MEASURE_DISPLAY_FOLDER>(.*?)</MEASURE_DISPLAY_FOLDER>", row)
            folder = folder[1] if folder else ""
            caption = re.search("<MEASURE_CAPTION>(.*?)</MEASURE_CAPTION>", row)[1]
            agg_type = re.search("<MEASURE_AGGREGATOR>(.*?)</MEASURE_AGGREGATOR>", row)[1]
            # 9 is calculated measures so we need a real agg_type, seems like it defaults to sum
            if agg_type == 9:
                agg_type = 1
            format_string = re.search("<DEFAULT_FORMAT_STRING>(.*?)</DEFAULT_FORMAT_STRING>", row)
            format_string = format_string[1] if format_string else ""
            description = re.search("<DESCRIPTION>(.*?)</DESCRIPTION>", row)
            description = description[1] if description else ""
            db_type = re.search("<DATA_TYPE>(.*?)</DATA_TYPE>", row)[1]
            metric = {
                "query_name": metric_name,
                "caption": caption,
                "agg_type": int(agg_type),
                "agg_type_string": agg_type_lookup[int(agg_type)],
                "format_string": format_string,
                "description": description,
                "data_type": int(db_type),
                "data_type_string": data_type_lookup[int(db_type)],
                "folder": folder,
            }
            metrics.append(metric)
        except:
            print(f"skipping metric: {metric_name}")
    return metrics


def get_attributes(token: str) -> dict[str, list[str]]:
    # need to parse the rows to end up with a dictionary of hierarchies to all levels in them including secondary attributes
    statement = "SELECT LEVEL_NAME, HIERARCHY_UNIQUE_NAME, LEVEL_NUMBER, LEVEL_CAPTION, DESCRIPTION, LEVEL_DBTYPE FROM $system.MDSCHEMA_LEVELS WHERE [CUBE_NAME] = @CubeName and [LEVEL_NAME] &lt;&gt; '(All)' and [DIMENSION_UNIQUE_NAME] &lt;&gt; '[Measures]'"
    level_rows = get_dmv_data(token, statement)
    statement = "SELECT HIERARCHY_UNIQUE_NAME, HIERARCHY_DISPLAY_FOLDER FROM $system.MDSCHEMA_HIERARCHIES WHERE [CUBE_NAME] = @CubeName"
    hierarchy_rows = get_dmv_data(token, statement)
    folder_lookup = {}
    for row in hierarchy_rows:
        try:
            hierarchy_name = re.search("<HIERARCHY_UNIQUE_NAME>(.*?)</HIERARCHY_UNIQUE_NAME>", row)[
                1
            ]
            folder = re.search("<HIERARCHY_DISPLAY_FOLDER>(.*?)</HIERARCHY_DISPLAY_FOLDER>", row)
            folder = folder[1] if folder else ""
            folder_lookup[hierarchy_name] = folder
        except:
            print(f"skipping hierarchy: {hierarchy_name}")

    attributes = {}
    for row in level_rows:
        try:
            level_name = re.search("<LEVEL_NAME>(.*?)</LEVEL_NAME>", row)[1]
            hierarchy_name = re.search("<HIERARCHY_UNIQUE_NAME>(.*?)</HIERARCHY_UNIQUE_NAME>", row)[
                1
            ]
            folder = folder_lookup[hierarchy_name]
            dimension_name = hierarchy_name.split("].[")[0][1:]
            hierarchy_name = hierarchy_name.split("].[")[1][:-1]
            caption = re.search("<LEVEL_CAPTION>(.*?)</LEVEL_CAPTION>", row)[1]
            level_number = re.search("<LEVEL_NUMBER>(.*?)</LEVEL_NUMBER>", row)[1]
            description = re.search("<DESCRIPTION>(.*?)</DESCRIPTION>", row)
            description = description[1] if description else ""
            db_type = re.search("<LEVEL_DBTYPE>(.*?)</LEVEL_DBTYPE>", row)
            db_type = db_type[1] if db_type else 130
            level = {
                "query_name": level_name,
                "caption": caption,
                "level_number": int(level_number),
                "description": description,
                "data_type": int(db_type),
                "data_type_string": data_type_lookup[int(db_type)],
                "folder": folder,
            }
            if dimension_name in attributes:
                if hierarchy_name in attributes[dimension_name]:
                    attributes[dimension_name][hierarchy_name].append(level)
                else:
                    attributes[dimension_name][hierarchy_name] = [level]
            else:
                attributes[dimension_name] = {hierarchy_name: [level]}
        except:
            print(f"skipping attribute: {level_name}")
    return attributes


def get_token() -> str:
    # authenticate and get bearer token
    if installer:
        url = f"{atscale_url}:10500/{organization_id}/auth"
        response = requests.get(
            url, auth=requests.auth.HTTPBasicAuth(username, password), verify=False
        )
        return response.content.decode()
    else:
        url = f"{atscale_url}/auth/realms/atscale/protocol/openid-connect/token"
        data = {
            "client_id": "atscale-ai-link",
            "grant_type": "password",
            "username": username,
            "password": password,
        }
        response = requests.post(url, data=data, verify=False)
        return response.json()["access_token"]


def generate_yaml_file(metrics, attributes):
    objects = {"metrics": metrics, "attributes": attributes}
    with open(filename, "w") as file:
        yaml.dump(objects, file, default_flow_style=False, allow_unicode=True)


token = get_token()
metrics = get_metrics(token)
attributes = get_attributes(token)
generate_yaml_file(metrics, attributes)
