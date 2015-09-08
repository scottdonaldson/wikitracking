var gulp = require('gulp'),
    sass = require('gulp-sass'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer-core'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    browserSync = require('browser-sync').create();
var reload = browserSync.reload;

// ----- Config

var paths = {
    jsIn: 'js/src',
    jsOut: 'js/min',
    cssIn: 'scss/**/*.scss',
    cssOut: 'css',
    html: ['./index.html']
};

paths.jsFiles = ['start', 'init', 'end'];

paths.jsFiles.forEach(function(path, i) {
    paths.jsFiles[i] = paths.jsIn + '/' + paths.jsFiles[i] + '.js';
});

gulp.task('css', function() {

    var processors = [
        require('autoprefixer-core')('last 2 versions')
    ];

    gulp.src( paths.cssIn )
        .pipe(sass({
            outputStyle: 'compressed'
        }))
        .pipe(postcss(processors))
        .pipe(gulp.dest( paths.cssOut ))
        .pipe(reload({ stream: true }));

});

gulp.task('js', function() {

    gulp.src( paths.jsFiles )
        .pipe(concat('script.js'))
        .pipe(gulp.dest( paths.jsOut ));

        gulp.src( paths.jsFiles )
            .pipe(concat('script.min.js'))
            .pipe(uglify())
            .pipe(gulp.dest( paths.jsOut ));
});



gulp.task('watch', ['css', 'js'], function() {
    browserSync.init({
        server: {
            baseDir: './'
        }
    });

    gulp.watch( paths.jsFiles, ['js'] ).on('change', reload);
    gulp.watch( paths.html ).on('change', reload);
});

gulp.task('default', ['css', 'js', 'watch']);
