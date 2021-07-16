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
var inlineCSS = null;

var fs = require("fs");
var path = require("path");
var generator = require("./generateThemes.js");
var colors = require("colors/safe");

// print process.argv
var folderPath = path.join(__dirname, "..");
var templateFilePaths = [ path.join(folderPath, "ti-core-stylesheets.template"), 
                          path.join(folderPath, "ti-designer-stylesheet.template") ];

var doInlineCSS = function(templateFilePath, templateVariables)
{
    console.log("  Reading " + templateFilePath + " ...\n");

    var outputFilePath = templateFilePath.replace('.template', '.html');

    content = fs.readFileSync(templateFilePath, "utf8");
    var lines = content.split('\n');
    var outputLines = [];
    for (var i = 0; i < lines.length; i++){
        var line = lines[i];
        var startIndex = line.indexOf('%%');
        var endIndex = line.lastIndexOf('%%');
        if ((startIndex >= 0) && (startIndex !== endIndex)) {
            var cssFileName = line.substring(startIndex+2,endIndex);
            if (cssFileName.indexOf('.css') > 0) {
                var cssFilePath = path.join(folderPath,cssFileName);
                var cssContent = fs.readFileSync(cssFilePath,'utf8');
                var cssLines = cssContent.split('\n');
                outputLines = outputLines.concat(cssLines);
                console.log("last line of "+cssFileName+" = "+cssLines[cssLines.length-1]);
            }
            else {
                var templateValue = templateVariables[cssFileName];
                if (templateValue) {
                    var templateLines = templateValue.split('\n');
                    outputLines = outputLines.concat(templateLines);
                    console.log("last line of "+cssFileName+" = "+templateLines[templateLines.length-1]);
                } else {
                    console.log(colors.red("ERROR: unrecognized template variable %%" + cssFileName + '%% found.'));
                    return;
                }
            }
        } else {
            outputLines.push(line);
        }
    }
    fs.writeFileSync(outputFilePath,outputLines.join('\n'),"utf-8");
    console.log(colors.green("  Finished: output written to "+outputFilePath + "\n  (number of lines = "+outputLines.length+")"));
};

generator(function(templateVariables) 
{
    for(var templateNo = 0; templateNo < templateFilePaths.length; templateNo++) {
        doInlineCSS(templateFilePaths[templateNo], templateVariables);
    }
});
