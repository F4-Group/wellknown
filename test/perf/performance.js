var fs = require('fs'),
    path = require('path'),
    parse = require('../../');

var ITERATIONS = 10000;

var wkt = fs.readFileSync(path.resolve(__dirname, '../data/geometrycollection.wkt')) + '';

var startDate = Date.now();
var geojson;
for (var i = 0; i < ITERATIONS; ++i) {
    geojson = parse(wkt);
}
var endDate = Date.now();
var averageDuration = (endDate - startDate) / ITERATIONS;
console.log('Average parse duration : ' + averageDuration + 'ms');
