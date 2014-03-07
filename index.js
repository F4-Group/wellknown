module.exports = parse;

var startsWith = String.prototype.startsWith;
if (!startsWith) {
    startsWith = function (searchString, position) {
        position = position || 0;
        return this.substring(position, position + searchString.length) === searchString;
    };
}

var SPACES = " \f\n\r\t\v​\u00a0\u1680​\u180e\u2000​\u2001\u2002​\u2003\u2004​\u2005\u2006​\u2007\u2008​\u2009\u200a​\u2028\u2029​​\u202f\u205f​\u3000";
var NUMBER_REGEXP = /^[-+]?[0-9]+(\.[0-9]+)?/;

var TYPES = [
    "point",
    "multipoint",
    "multilinestring",
    "linestring",
    "polygon",
    "multipolygon"
];
var TYPE_NAMES = {
    point: 'Point',
    multipoint: 'MultiPoint',
    multilinestring: 'MultiLineString',
    linestring: 'LineString',
    polygon: 'Polygon',
    multipolygon: 'MultiPolygon'
};

/*
 * Parse WKT and return GeoJSON.
 *
 * @param {string} _ A WKT geometry
 * @return {?Object} A GeoJSON geometry object
 */
function parse(_) {
    var parts = _.split(";"),
        _ = parts.pop().toLowerCase(),
        srid = (parts.shift() || "").split("=").pop();

    var i = 0;

    function parseString(string) {
        if (string.length > 1 && !startsWith.call(_, string, i))
            return null;
        i += string.length;
        return string;
    }

    function crs(obj) {
        if (obj && srid.match(/\d+/)) {
            obj.crs = {
                type: 'name',
                'properties': {
                    name: 'urn:ogc:def:crs:EPSG::' + srid
                }
            };
        }

        return obj;
    }

    function white() {
        while (i < _.length && SPACES.indexOf(_.charAt(i)) >= 0)
            ++i;
    }

    function multicoords() {
        white();
        var depth = 0, rings = [], stack = [rings],
            pointer = rings, elem, number, match;
        while (i < _.length) {
            elem = _.charAt(i);
            if (elem === '(') {
                ++i;
                stack.push(pointer);
                pointer = [];
                stack[stack.length - 1].push(pointer);
                depth++;
            } else if (elem === ')') {
                ++i;
                pointer = stack.pop();
                depth--;
                if (depth == 0) break;
            } else if (elem === ',') {
                ++i;
                pointer = [];
                stack[stack.length - 1].push(pointer);
            } else {
                elem = _.substring(i);
                number = parseFloat(elem);
                if (!isNaN(number)) {
                    pointer.push(number);
                    var match = elem.match(NUMBER_REGEXP);
                    if (match) i += match[0].length;
                } else break;
            }
            white();
        }
        stack.length = 0;
        if (depth !== 0) return null;
        return rings;
    }

    function generic() {
        var type, typeIndex;
        for (typeIndex = 0; typeIndex < TYPES.length; ++typeIndex) {
            type = parseString(TYPES[typeIndex]);
            if (type) {
                var c = multicoords();
                if (type == 'point')
                    c = c[0];
                white();
                return {
                    type: TYPE_NAMES[type],
                    coordinates: c
                };
            }
        }
        return null;
    }

    function geometrycollection() {
        var geometries = [], geometry;

        if (!parseString("geometrycollection")) return null;
        white();

        if (_.charAt(i) != '(') return null;
        ++i;
        while (geometry = root()) {
            geometries.push(geometry);
            white();
            if (_.charAt(i) == ',') {
                ++i;
                white();
            }
        }
        if (_.charAt(i) != ")") return null;
        ++i;

        return {
            type: 'GeometryCollection',
            geometries: geometries
        };
    }

    function root() {
        return generic() ||
            geometrycollection();
    }

    return crs(root());
}
