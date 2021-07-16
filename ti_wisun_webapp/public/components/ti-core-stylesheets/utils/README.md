# inlineCSS

ti-core-stylesheet utility

## Motivation
Firefox does not support importing a file that contains links to .css files.  This utility gets around that by
reading in the .css file contents and copying it inside of <style\> </style\> tags.  It determines the file path of the
.css files to read by looking for %[file path]% tags within the ti-core-stylesheets.template file and replaces those tags with the contents
of the file.

## Running the utility
* To run the utility, you will need to have node.js installed.
* cd into the components/ti-core-stylesheets/utils folder, and then type:

    npm run build

