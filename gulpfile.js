'use strict';
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/fast-browserify-builds-with-watchify.md

var watchify = require('watchify');
var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var assign = require('lodash.assign');
var babelify = require("babelify");
var nodemon = require('gulp-nodemon');
var beeper = require('beeper');

// add custom browserify options here
var customOpts = {
  entries: ['./client/index.js'],
  transform: [babelify.configure({presets: ["es2015"]})],
  debug: true
};
var opts = assign({}, watchify.args, customOpts);
var b = watchify(browserify(opts)); 

// add transformations here
// i.e. b.transform(coffeeify);

gulp.task('client', bundle); 
b.on('update', bundle); // on any dep update, runs the bundler
b.on('log', gutil.log); // output build logs to terminal

function bundle() {
  return b.bundle()
    // log errors if they happen
    .on('error', function(err) {
        beeper();
        console.log("Browserify error",err);
     })
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(gulp.dest('./public'));
}


gulp.task('server', ['client'], function (cb) {
  return nodemon({
      script: './server/app.js',
      watch: './server/'
  });
});


gulp.task('default', ['server']);
