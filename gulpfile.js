const gulp = require('gulp');
const googleWebFonts = require('gulp-google-webfonts');
const del = require('del');

const paths = {
    cssDir: './src/css/',
};

function clean() {
    return del([paths.cssDir]);
}

function webfonts() {
    return gulp.src('./webfonts.list')
        .pipe(googleWebFonts({
            fontsDir: 'webfonts',
            cssFilename: 'webfonts.css',
            format: 'woff',
        }))
        .pipe(gulp.dest(paths.cssDir));
}

exports.clean = clean;
exports.webfonts = gulp.series(clean, webfonts);
exports['prebuild:renderer'] = webfonts;;
