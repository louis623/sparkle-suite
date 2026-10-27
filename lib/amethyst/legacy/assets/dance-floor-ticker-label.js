/* global window */
// Shared by the homepage and Dance Floor tickers. Jewelry type stays off this line.
function danceFloorTickerLabel(item) {
  var name = String(item && item.name || "").trim();
  var collection = String(item && item.collection || "").trim();
  return name + " · " + (collection || "Collection pending");
}

window.danceFloorTickerLabel = danceFloorTickerLabel;
