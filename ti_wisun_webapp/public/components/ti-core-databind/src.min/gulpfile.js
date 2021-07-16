var gulp	= require("gulp"),
	concat	= require("gulp-concat"),
	rename	= require("gulp-rename"),
	uglify	= require("gulp-uglify");
	fs		= require("fs");

gulp.task("default", function() {
	var lines = fs.readFileSync("../ti-core-databind.html").toString();
	lines = lines.split("\n");
	
	var beginParsing = false;
	var files = [];
	
	for (var i = 0; i < lines.length; ++i) {
		var line = lines[i];
		if (line.indexOf("gulp end") > 0) {
			break;
		}
		
		if (line.indexOf("gulp begin") > 0) {
			beginParsing = true;
			continue;
		}
		
		if (beginParsing) {
			var start = line.indexOf("src='");
			if (start > 0) {
				var end = line.indexOf("'", start+5);
				var src = line.substring(start+5, end);
				
				files.push("../" + src);
			}
		}
	}

	return gulp.src(files)
		.pipe(concat("bundle.js"))
		.pipe(gulp.dest("build"))
		.pipe(rename("bundle.min.js"))
		.pipe(uglify())
		.pipe(gulp.dest("build"));
});

gulp.start();