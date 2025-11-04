#include "IniFile.hpp"
#include <fstream>
#include <iostream>
#include <algorithm>
#include <cctype>

#define TRACE_GROUP "inif"

IniFile::IniFile(const std::string& filename) : filename(filename) {}

IniFile::~IniFile() {}

bool IniFile::parse() {
    std::ifstream file(filename);
    if (!file.is_open()) {
        tr_err("Failed to open file: %s", filename.c_str());
        return false;
    }
    
    std::string line;
    std::string currentSection;
    std::shared_ptr<IniSection> currentSectionPtr = nullptr;
    
    while (std::getline(file, line)) {
        // Trim whitespace
        line.erase(0, line.find_first_not_of(" \t\r\n"));
        line.erase(line.find_last_not_of(" \t\r\n") + 1);
        
        // Skip empty lines and comments
        if (line.empty() || line[0] == ';' || line[0] == '#' || 
            (line[0] == '/' && line.size() > 1 && line[1] == '/')) {
            continue;
        }
        
        // Check if this is a section header
        if (line[0] == '[' && line[line.size() - 1] == ']') {
            currentSection = line.substr(1, line.size() - 2);
            currentSectionPtr = getSection(currentSection);
            continue;
        }
        
        // Must be a key-value pair
        size_t equalPos = line.find('=');
        if (equalPos != std::string::npos && currentSectionPtr) {
            std::string key = line.substr(0, equalPos);
            std::string value = line.substr(equalPos + 1);
            
            // Trim key and value
            key.erase(0, key.find_first_not_of(" \t"));
            key.erase(key.find_last_not_of(" \t") + 1);
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t") + 1);
            
            // Handle quoted values
            if (value.size() >= 2 && 
                ((value[0] == '"' && value[value.size() - 1] == '"') || 
                 (value[0] == '\'' && value[value.size() - 1] == '\''))) {
                value = value.substr(1, value.size() - 2);
            }
            
            currentSectionPtr->parseItem(key, value);
        }
    }
    
    // Validate all sections
    bool valid = true;
    for (const auto& section : sections) {
        if (!section.second->validate()) {
            tr_err("Section validation failed: %s", section.first.c_str());
            valid = false;
        }
    }
    
    return valid;
}

void IniFile::registerSection(const std::string& sectionType, std::shared_ptr<IniSection> section) {
    sections[sectionType] = section;
}

std::shared_ptr<IniSection> IniFile::getSection(const std::string& sectionName) const {
    auto it = sections.find(sectionName);
    if (it != sections.end()) {
        return it->second;
    }
    return nullptr;
}

std::vector<std::string> IniFile::getSectionNames() const {
    std::vector<std::string> names;
    for (const auto& section : sections) {
        names.push_back(section.first);
    }
    return names;
}
