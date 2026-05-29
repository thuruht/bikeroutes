/**
 * Decodes an encoded polyline string into an array of [longitude, latitude] coordinates.
 * Compatible with Valhalla's polyline6 format.
 */
export function decodePolyline(str, precision = 6) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];
  const shift = Math.pow(10, precision);
  const factor = 1;

  while (index < str.length) {
    let b;
    let shiftCount = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shiftCount;
      shiftCount += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shiftCount = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shiftCount;
      shiftCount += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lng / shift, lat / shift]);
  }

  return coordinates;
}
