# fork-pipe
Inline fork/join stream processing.

# Overview
Primarily intended for use with gulp, allows inline fork/join stream processing in a pipeline.

# Installation
For the latest version:
```
npm install fork-pipe
```

# Usage
```ts
var fork = require("fork-pipe")
  , gulp = require("gulp")
  , ts = require("gulp-typescript")
  , sourcemaps = rquire("gulp-sourcemaps");

gulp.task("build", () => gulp.src("**/*.ts")
    .pipe(sourcemaps.init())
    .pipe(ts())
    .pipe(fork()) // fork the output of ts()

    // add a fork to handle the .d.ts output
    .add(out => out.dts)

    // add a fork to handle the .js output
    .add(out => out.js.pipe(sourcemaps.write(".")))

    // join the respective forks together into a merge2 stream and pipe the merged results
    .pipe(gulp.dest("."));

```