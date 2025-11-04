#ifndef INI_FILE_HPP
#define INI_FILE_HPP

#include <string>
#include <map>
#include <memory>
#include <vector>
#include "IniSection.hpp"

class IniFile {
private:
    std::string filename;
    std::map<std::string, std::shared_ptr<IniSection>> sections;
    
public:
    IniFile(const std::string& filename);
    ~IniFile();
    
    bool parse();
    void registerSection(const std::string& sectionType, std::shared_ptr<IniSection> section);
    std::shared_ptr<IniSection> getSection(const std::string& sectionName) const;
    std::vector<std::string> getSectionNames() const;
};

#endif // INI_FILE_HPP
