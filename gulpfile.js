var gulp = require("gulp"),
babel = require("gulp-babel");

/* @ run task */
gulp.task("run" , function(){
  console.log("task runner");
});

/* Default */

gulp.task("default", ["run"]);
