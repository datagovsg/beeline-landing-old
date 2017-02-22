
function latlngDistance(ll1, ll2) {
  var rr1 = [ll1[0] / 180 * Math.PI, ll1[1] / 180 * Math.PI]
  var rr2 = [ll2[0] / 180 * Math.PI, ll2[1] / 180 * Math.PI]

  var dx = (rr1[1] - rr2[1]) * Math.cos(0.5 * (rr1[0] + rr2[0]))
  var dy = rr1[0] - rr2[0]

  var dist = Math.sqrt(dx * dx + dy * dy) * 6371000
  return dist
}

function isWithinReach(tripStop, suggestedPoint, maxDistance) {
  const tripStopLongLatCoords = tripStop.stop.coordinates.coordinates;
  const distance = latlngDistance(
    tripStopLongLatCoords.reverse(),
    [suggestedPoint.lat(), suggestedPoint.lng()]
  );
  return distance < maxDistance;
}

export { latlngDistance, isWithinReach };
