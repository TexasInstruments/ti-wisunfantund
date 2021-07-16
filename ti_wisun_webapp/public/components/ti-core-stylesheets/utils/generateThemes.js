/*
 * Copyright (c) 2016, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * */
var fs = require("fs");
var path = require("path");
var folderPath = path.join(__dirname, "..", "themes");
var templateFilePath = path.join(folderPath, "base-theme.css");
var colors = require('colors/safe'); // does not alter string prototype

var splitCSSIntoRules = function(text) 
{
    var rules = text.split('}');
    var count = rules.length;
    var result = [];
    
    for(var i = 0; i < count; i++ )
    {
        var rule = rules[i];
        var matches = rule.match(/{/g);
        var openBraces = matches ? matches.length : 0;
        
        if (openBraces < 1 && i < count-1) 
        {
            throw '  Error: missing opening brace "{" for rule: ' + rule;
        }
        else 
        {
            // eat nested closing braces. 
            for( ; openBraces > 1; openBraces--)
            {
                i++;
                if (i === count)
                {
                    throw '  Error: missing closing brace "}" for rule: ' + rule;
                }
                rule = rule + '}' + rules[i];  
            }
        }
        result.push(rule);
    }
    return result;
};

var splitRuleIntoSections = function(rule)
{
    var pos = rule.indexOf('{');
    var result = [];
    if (pos > 0)
    {
        result.push(rule.substring(0, pos));
        result.push(rule.substring(pos+1));
    }
    else 
    {
        result.push(rule);
    }    
    return result;
};

var splitLinesIntoFields = function(line) 
{
    var fields = line.split('"');
    var i;
    for(i = 1; i < fields.length; i+=2)
    {
        fields[i] = fields[i].split(',').join('_comma_');
    }
    line = fields.join('');  // removes quotes
    fields = line.split(',');
    for(i = fields.length; i-- > 0; )
    {
        fields[i] = fields[i].split('_comma_').join(',');
    }
    return fields;
};

var generateCSS = function(templateContent, filename) 
{
    var themeDataPath = path.join(folderPath, filename + '.csv');
    console.log("  Reading " + themeDataPath + " ...");
    
    var content = fs.readFileSync(themeDataPath, "utf8");
    
    var lines = content.split('\r\n');
    if (lines.length < 2)
    {
        lines = content.split('\n')
    }
    var colHeadings = splitLinesIntoFields(lines[0]);
    for (var i = 1; i < lines.length; i++){
        var line = lines[i];
        
        var fields = splitLinesIntoFields(line);
        var rowHeading = fields[0].trim();
        for (var j = 1; j < fields.length; j++)
        {
            var colHeading = colHeadings[j].trim();
            var varName = '%%' + rowHeading + '-' + colHeading + '%%';
            var value = fields[j].trim();
            if (value.length > 0) 
            {
                var length = templateContent.length;
                var newTemplateContent = templateContent.split(varName).join(fields[j])
                if (templateContent.length === newTemplateContent.length && templateContent === newTemplateContent)
                {
                    // warn that an entry in the .csv file is not being used in the base-theme.css;
                    console.log(colors.yellow('  Warning: entry ' + rowHeading + '-' + colHeading + ' = ' + value + ' is not being used.'));
                }
                templateContent = newTemplateContent;
            }
        }
    }
    var outputFilePath = path.join(folderPath, filename + ".css");
    templateContent = templateContent.split('%%theme-id%%').join('.' + filename);
    
    // find template variables that have not been substituted 
    var temp = templateContent.split('%%');
    var missingVariables = {};
    
    if (temp.length > 1)
    {
        for(var i = 1; i < temp.length; i+=2 )
        {
            missingVariables[temp[i]] = true;
        }
        for(var variable in missingVariables)
        {
            if (missingVariables.hasOwnProperty(variable))
            {
                console.log(colors.red('  Error: missing variable for %%' + variable + '%%'));
            }
        }
    }    
    
    
    fs.writeFileSync(outputFilePath, templateContent, "utf-8");
    console.log("  Finished: output written to " + outputFilePath);
    return splitCustomRulesOut(templateContent);
};

var customRules = [];
var standardRules = [];
var lastRule = '}\n';

var splitCustomRulesOut = function(input)
{
    var results = { customRules: [], standardRules: [] };
    
    var rules = splitCSSIntoRules(input);
        
    for(var i = 0; i < rules.length; i++)
    {
        var rule = rules[i];

        var sections = splitRuleIntoSections(rule);
        if (sections.length > 1)
        {
            if (sections.length != 2)
            {
                console.log("Error: unmatched { } braces");
                return;
            }
            
            if (sections[1].indexOf('--') >= 0) 
            {
                customRules.push(rule);
                results.customRules.push(rule);
            }
            else 
            {
                standardRules.push(rule);
                results.standardRules.push(rule);
            }
        }
        else 
        {
            lastRule = rule;
            results.customRules.push(rule);
            results.standardRules.push(rule);
        }
    }
    if (rules.length < 5)
    {
        console.log("Not enough rules found.");
    }
    return results;
};

var doubleUpRules = function(input)
{
    var rules = splitCSSIntoRules(input);
        
    for(var i = 0; i < rules.length; i++)
    {
        var rule = rules[i];

        var sections = splitRuleIntoSections(rule);
        if (sections.length > 1)
        {
            if (sections.length != 2)
            {
                console.log("Error: unmatched { } braces");
                return;
            }
            
            var matches = sections[0].replace(/[ \t]+$/, '').split(",");
            var count = matches.length;
            for(var j = 0; j < count; j++)
            {
                var match = matches[j].replace(/^\s*\/\*(.|\s)+\*\//, '');
                match = match.replace('html', 'html#' + 'designer-frame');
                match = match.replace('%%theme-id%%', '.designer-theme');
                matches.push(match);
            }
            
            sections[0] = matches.join(",");
            rules[i] = sections.join(" {");
        }
    }
    
    return rules.join("}");
};

var collapseRulesIntoRoot = function(rules)
{
    var rootRules = [];
        
    for(var i = 0; i < rules.length; i++)
    {
        var rule = rules[i];

        var sections = splitRuleIntoSections(rule);
        if (sections.length > 1)
        {
            if (sections.length != 2)
            {
                console.log("Error: unmatched { } braces");
                return;
            }
            rootRules.push(sections[1]);
        }
    }
    return '\t:root { ' + rootRules.join('') + '}';
};

module.exports = function(callback) 
{
    fs.readFile(templateFilePath, "utf8", function(err, templateContent)
    {
        var designerRules = { customRules: [], standardRules: [] };
        if (err)
        {
            console.log("  Error: " + err);
            callback({});
        }
        else
        {
            var files = fs.readdirSync(folderPath);
            
            for(var i = files.length; i-- > 0; )
            {
                var filename = files[i];
                var extension = '.csv';
                if (filename.lastIndexOf(extension) === filename.length - extension.length)
                {
                    if (filename === 'lightgray-theme.csv')
                    {
                        var doubledTemplate = doubleUpRules(templateContent);
                        designerRules = generateCSS(doubledTemplate, filename.substring(0, filename.length - extension.length));
                    }
                    else 
                    {
                        generateCSS(templateContent, filename.substring(0, filename.length - extension.length));
                    }
                }
            }
            customRules.push(lastRule);
            standardRules.push(lastRule);
            callback({ 'custom-themes': customRules.join("}"), 
                'standard-themes': standardRules.join("}"),
                'designer-custom-themes': collapseRulesIntoRoot(designerRules.customRules), 
                'designer-standard-themes': designerRules.standardRules.join("}")
            });
        }
    });
};

