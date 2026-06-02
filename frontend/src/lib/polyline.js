/**
 * Decodes an encoded polyline string into an array of coordinates.
 * Supports 2D (lat, lng) or 3D (lat, lng, elevation).
 * Compatible with Valhalla's polyline6 format.
 */
export function decodePolyline(str, precision = 6, dims = 2) {
  let index = 0;
  const values = new Array(dims).fill(0);
  const coordinates = [];
  const shift = Math.pow(10, precision);

  while (index < str.length) {
    for (let d = 0; d < dims; d++) {
      let b;
      let shiftCount = 0;
      let result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shiftCount;
        shiftCount += 5;
      } while (b >= 0x20);
      const delta = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      values[d] += delta;
    }

    if (dims === 3) {
      // Return [lng, lat, ele] - MapLibre uses [lng, lat] but we keep ele for charts
      coordinates.push([values[1] / shift, values[0] / shift, values[2]]);
    } else {
      coordinates.push([values[1] / shift, values[0] / shift]);
    }
  }

  return coordinates;
}
