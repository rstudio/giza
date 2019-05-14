module.exports = Map;

function Map() {
  return Object.create(null);
}

Map.from = function(obj) {
  let map = new Map();
  Object.assign(map, obj);
  return map;
};

