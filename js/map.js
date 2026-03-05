mapboxgl.accessToken = 'pk.eyJ1IjoiYWJoaXZvbGV0aSIsImEiOiJjbW05cWV4ZTEwNXJtMnVwdjNyNmg3YmtzIn0.18DTC_mGG-07zo8XgcOgXg';

const map = new mapboxgl.Map({ //
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [-73.5673, 45.5017],
  zoom: 15,
  pitch: 60,
  bearing: -20,
  antialias: true
});

map.on('load', () => {
  map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true,
    showUserHeading: true
  })
);



  // 3D BUILDINGS
  map.addLayer({
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 4,
    paint: {
      'fill-extrusion-color': '#111',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 1
    }
  });

});

const coordinatesGeocoder = function (query) {
  const matches = query.match(
    /^[ ]*(?:Lat: )?(-?\d+\.?\d*)[, ]+(?:Lng: )?(-?\d+\.?\d*)[ ]*$/i
  );
  if (!matches) return null;

  function coordinateFeature(lng, lat) {
    return {
      center: [lng, lat],
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      place_name: 'Lat: ' + lat + ' Lng: ' + lng,
      place_type: ['coordinate'],
      type: 'Feature'
    };
  }

  const coord1 = Number(matches[1]);
  const coord2 = Number(matches[2]);
  const geocodes = [];

  if (coord1 < -90 || coord1 > 90) {
    geocodes.push(coordinateFeature(coord1, coord2));
  }

  if (coord2 < -90 || coord2 > 90) {
    geocodes.push(coordinateFeature(coord2, coord1));
  }

  if (geocodes.length === 0) {
    geocodes.push(coordinateFeature(coord1, coord2));
    geocodes.push(coordinateFeature(coord2, coord1));
  }

  return geocodes;
};

const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  localGeocoder: coordinatesGeocoder,
  mapboxgl: mapboxgl,
  zoom: 106,
  placeholder: 'Search or type: lng, lat',
  reverseGeocode: true
});

map.addControl(geocoder);

geocoder.on('result', (e) => {
  const coords = e.result.center;
  console.log("coords " + coords); 

  // move map (optional but smooth)
  map.flyTo({
    center: coords,
    zoom: 16,
    pitch: 60
  });

  // move your 3D object
//  merc = mapboxgl.MercatorCoordinate.fromLng
//  Lat(coords, 0);
// cube.position.set(merc.x, merc.y, merc.z);
});