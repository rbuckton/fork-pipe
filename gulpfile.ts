import gulp = require("gulp");
import path = require("path");
import del = require("del");
import sourcemaps = require("gulp-sourcemaps");
import ts = require("gulp-typescript");
import merge = require("merge2");

const fork = () => require(".")(); // delay load fork
const lib = ts.createProject("./src/lib/tsconfig.json", { typescript: require("typescript") });

gulp.task("clean", cb => del("out", cb));

gulp.task("build-without-fork", ["clean"], () => lib.src()
    .pipe(ts(lib))
    .pipe(gulp.dest(lib.options.outDir)));

gulp.task("build:debug", ["build-without-fork"], () => lib.src()
    .pipe(sourcemaps.init())
    .pipe(ts(lib))
    .pipe(fork())
    .add(ts => ts.dts)
    .add(ts => ts.js)
    .pipe(sourcemaps.write(".", {
        includeContent: false,
        sourceRoot: path.posix.relative(lib.projectDirectory, lib.options.outDir)
    }))
    .pipe(gulp.dest(lib.options.outDir)));

gulp.task("build:release", ["build-without-fork"], () => lib.src()
    .pipe(ts(lib))
    .pipe(fork())
    .add(ts => ts.dts)
    .add(ts => ts.js)
    .pipe(gulp.dest(lib.options.outDir)));

gulp.task("build", ["build:debug"]);
gulp.task("default", ["build"]);