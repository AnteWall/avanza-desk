const rad = Math.PI / 180;

/**
 * Where the sun is straight overhead at `now`, as [latitude, longitude] in degrees.
 * Low-precision almanac formulas: within about a degree, plenty for shading a world map.
 */
export function subsolarPoint(now: Date): [number, number] {
  const d = now.getTime() / 86_400_000 - 10_957.5; // days since J2000
  const g = (357.529 + 0.98560028 * d) * rad; // mean anomaly
  const q = 280.459 + 0.98564736 * d; // mean longitude
  const l = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad; // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * rad; // obliquity
  const declination = Math.asin(Math.sin(e) * Math.sin(l)) / rad;
  const ascension = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)) / rad;
  const gmst = (18.697374558 + 24.06570982441908 * d) * 15;
  const lon = ((((ascension - gmst + 180) % 360) + 360) % 360) - 180;
  return [declination, lon];
}

/**
 * The night side as an SVG path in equirectangular coordinates (x = lon + 180, y = north - lat),
 * between latitudes `north` and `south`.
 */
export function nightPath(now: Date, north: number, south: number) {
  const [lat, lon] = subsolarPoint(now);
  // At the equinoxes the line is vertical; a tiny declination keeps tan() finite.
  const tanDec = Math.tan((Math.abs(lat) < 0.1 ? 0.1 : lat) * rad);
  const points: string[] = [];
  for (let x = -180; x <= 180; x += 2) {
    const edge = Math.atan(-Math.cos((x - lon) * rad) / tanDec) / rad;
    const y = north - Math.max(south, Math.min(north, edge));
    points.push(`${x + 180} ${y.toFixed(2)}`);
  }
  // Northern summer lights the north pole, so night lies south of the line; else north of it.
  const pole = lat > 0 ? north - south : 0;
  return `M0 ${pole}L${points.join("L")}L360 ${pole}Z`;
}
