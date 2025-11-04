# Ini Parser README

## Overview
The ini parser is a C++ library used to parse configuration files in the INI format. It is designed to be flexible and extensible, allowing users to easily add support for custom configuration sections.

## How it Works
The ini parser works by reading an INI file line by line, parsing each line into a key-value pair or a section header. The parser uses a map to store the parsed sections, where each section is an instance of the IniSection class.

The IniSection class provides a basic implementation for parsing key-value pairs, and can be subclassed to add custom parsing logic for specific sections. The IniFile class manages the parsing of the INI file and provides methods for accessing the parsed sections.

## Parsing Process
The parsing process involves the following steps:

1. Read the INI file line by line
2. Skip empty lines and comments
3. Identify section headers and create a new IniSection instance for each section
4. Parse key-value pairs and store them in the corresponding IniSection instance


## Adding More Parser Sections
To add support for a new configuration section, follow these steps:

### Step 1: Create a New Section Class
Create a new C++ class that inherits from IniSection. This class should provide a custom implementation for parsing the key-value pairs specific to the new section.

``` C
CustomSection::CustomSection(const std::string& name) : IniSection(name) {
    customField_ = false;
    customAddress_ = in6addr_any;
}
```

### Step 2: Register the New Section
In the CfgParser class, register the new section by calling the registerSection method and providing an instance of the new section class.
``` C
iniFile->registerSection("custom-cfg", std::make_shared<CustomSection>("custom-cfg"));
```

### Step 3: Implement Custom Parsing Logic
In the new section class, override the parseItem method to provide custom parsing logic for the key-value pairs specific to the new section.

``` C
bool CustomSection::parseItem(const std::string& key, const std::string& value) {
    // Store in the base class map
    IniSection::parseItem(key, value);

    if (key == "custom-field-enabled") {
        customField_ = getBoolValue(value);
    } else if (key == "custom-address") {
        customAddress_ = getIPv6AddressBytesValue(value);
    }
    return true;
}
```

### Step 4: Use the Parsed Values
In the CfgParse class, after parsing the INI file, get the section and use the values as desired.
``` C
auto customSection = getTypedSection<customSection>("custom-cfg");
if (customSection) {
    my_config.enabled = customSection->getCustomFieldEnabled();
    
    const in6_addr& my_custom_addr = customSection->getCustomAddress();
    std::copy(std::begin(my_custom_addr.s6_addr), std::end(my_custom_addr.s6_addr), my_config.custom_addr);
}
```