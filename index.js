module.exports = parse;

 /*
 * Parse WKT and return GeoJSON.
 *
 * @param {string} _ A WKT geometry
 * @return {?Object} A GeoJSON geometry object
 */
function parse(_) {
    var parts = _.split(";"),
        _ = parts.pop(),
        srid = (parts.shift() || "").split("=").pop();

    var i = 0;

    function $(re) {
        var match = _.substring(i).match(re);
        if (!match) return null;
        else {
            i += match[0].length;
            return match[0];
        }
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

    function white() { $(/^\s*/); }

    function multicoords() {
        white();
        var depth = 0, rings = [], stack = [rings],
            pointer = rings, elem;
        while (elem =
            $(/^(\()/) ||
            $(/^(\))/) ||
            $(/^(\,)/) ||
            $(/^[-+]?([0-9]*\.[0-9]+|[0-9]+)/)) {
            if (elem == '(') {
				stack.push(pointer);
				pointer = [];
				stack[stack.length-1].push(pointer);
                depth++;
            } else if (elem == ')') {
                pointer = stack.pop();
                depth--;
                if (depth == 0) break;
            } else if (elem === ',') {
				pointer = [];
				stack[stack.length-1].push(pointer);
            } else {
                pointer.push(parseFloat(elem));
            }
            white();
        }
		stack.length = 0;
        if (depth !== 0) return null;
        return rings;
    }

    function generic() {
		var type;
        if (type = $(/^(point|multipoint|multilinestring|linestring|polygon|multipolygon)/i)) {
			type = {
				point: 'Point',
				multipoint: 'MultiPoint',
				multilinestring: 'MultiLineString',
				linestring: 'LineString',
				polygon: 'Polygon',
				multipolygon: 'MultiPolygon'
			}[type.toLowerCase()];
			var c = multicoords();
			if (type == 'Point')
				c = c[0];
			white();
			return {
				type: type,
				coordinates: c
			};
		}
		return null;
    }

    function geometrycollection() {
        var geometries = [], geometry;

        if (!$(/^(geometrycollection)/i)) return null;
        white();

        if (!$(/^(\()/)) return null;
        while (geometry = root()) {
            geometries.push(geometry);
            white();
            $(/^(\,)/);
            white();
        }
        if (!$(/^(\))/)) return null;

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
