


window.onload = function () {

    // variables, default values 
    let lat =  45.5017;
    let long = -73.5673; 
    let boundingBoxThreshold = 0.1; 
    let zoomDist = 2; 

    // styling
    let markerColor = "#0800ffff"; 
    let selectedMarkerColour = "cornflowerblue"; 
    let roadsCol = '#111'; 

    // Pin data storage
    let pins=[]; 
    let gmapCoors = []; 
    let favs = []; // link to favourite places, add them by their nums identifier (make sure to copy the info, nums identifiers change every reload)
    let num = 0; // to count position

    // Get button element
    const locate = document.getElementById("locate"); 

    // Establish div location + declare loading 
    const resultsDiv = document.getElementById("coordinate-results");
    resultsDiv.style.visibility = "hidden"; // immediately hide 
    let gMap = document.createElement("button")
    gMap.textContent=">"; 
    resultsDiv.appendChild(gMap); 
    gMap.classList.add('info');

    let close = document.createElement("button"); 
    close.textContent="x"; 
    resultsDiv.appendChild(close); 
    close.classList.add('info');

    let name = document.createElement("h1"); 
    resultsDiv.appendChild(name); 
    let info = document.createElement("p"); 
    resultsDiv.appendChild(info); 

    getPlaces(); 

/* Create Map */ 
mapboxgl.accessToken = 'pk.eyJ1IjoiYWJoaXZvbGV0aSIsImEiOiJjbW05cWV4ZTEwNXJtMnVwdjNyNmg3YmtzIn0.18DTC_mGG-07zo8XgcOgXg';

const map = new mapboxgl.Map({ //
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [long, lat],
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
        showUserHeading: false
    }),
    "bottom-left"
  );
  
  map.addLayer({
  id: 'dark-overlay',
  type: 'background',
  paint: {
    'background-color': '#0A0A0A',  // deep night color
    'background-opacity': 0.9   // adjust for darkness
  }
}, 'waterway-label'); // insert below labels
map.setLayoutProperty('poi-label', 'visibility', 'none');


  // 3D BUILDINGS
  map.addLayer({
  id: '3d-buildings',
  source: 'composite',
  'source-layer': 'building',
  filter: ['==', 'extrude', 'true'],
  type: 'fill-extrusion',
  
  minzoom: 0,
  paint: {
    // Highlight selected building in bright orange
    'fill-extrusion-color': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      '#4DA6FF',     // highlighted building 
      [
        // Normal buildings: subtle height-based shading for visibility
        'interpolate',
        ['linear'],
        ['get', 'height'],
        0,   '#111', // shortest buildings
        50,  '#111', // medium buildings
        100, '#111'  // tallest buildings
]
    ],
    // Use building height from data
    'fill-extrusion-height': ['get', 'height'],
    // Base of the building
    'fill-extrusion-base': ['get', 'min_height'],
    // Full opacity ensures visibility on light maps
    'fill-extrusion-opacity': 0.9,
    'fill-extrusion-ambient-occlusion-intensity': 1
  }


  
  
});

  const roadLayerIds = map.getStyle().layers.filter(l => l.id.includes('road')).map(l => l.id);
  roadLayerIds.forEach(id => map.setPaintProperty(id, 'line-color', roadsCol));

});




    /* Get Current User Location */ 
    function getLocation() {
        if (!navigator.geolocation) {
            alert("Geolocation not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                lat = position.coords.latitude;
                long = position.coords.longitude;
                console.log("Latitude", lat);
                console.log("Longitude", long);

            },
            (err) => {
                console.error(err);
                alert("Location permission denied");
            },
            {
                enableHighAccuracy: true, // important for precise location
                maximumAge: 0
            }
        );
    }


    /* Get Coordinates Near You */ 
    function getPlaces() {
        //reset pins
        //let pins=[]; 

        // Overpass query (out body -> returns array of all body data, geom -> returns array of all coordinates listed for a spot) // less accurate results -> way["disused"="yes"] (${long-boundingBoxThreshold},${lat-boundingBoxThreshold},${long+boundingBoxThreshold},${lat+boundingBoxThreshold});
        console.log("places loading..."); 

        // gets different types of data from the api, gives location range of 2*boundingBoxThreshold  
        /* 
        */ 

        const query = `
        [out:json][timeout:180];
        (
            way["building"]["abandoned"="yes"](${lat-boundingBoxThreshold},${long-boundingBoxThreshold},${lat+boundingBoxThreshold},${long+boundingBoxThreshold}); 
            way["leisure"="skate_park"](${lat-boundingBoxThreshold},${long-boundingBoxThreshold},${lat+boundingBoxThreshold},${long+boundingBoxThreshold}); 
            way["building"="abandoned"](${lat-boundingBoxThreshold},${long-boundingBoxThreshold},${lat+boundingBoxThreshold},${long+boundingBoxThreshold}); 
            way["ruins"="*"](${lat-boundingBoxThreshold},${long-boundingBoxThreshold},${lat+boundingBoxThreshold},${long+boundingBoxThreshold}); 
            );
        out body geom; 
        `;

        // Fetch from Overpass API (if code stops returning coordinates, its because there is an issue with this)
        fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'data=' + encodeURIComponent(query)
})
.then(async (response) => {

    if (!response.ok) {
        const text = await response.text();
        console.error("Overpass error:", text);
        throw new Error("Overpass request failed");
    }

    return response.json();
})
.then(data => { // take usable JSOn file, store it as the name "data",  and run this function to extract different classifications of data


            // adds each data to a pins array, drops pin at each location 
            data.elements.forEach(el => {
            if (el.type === "way" && el.bounds) {

                // Get average location for each element
                let avgLat = (el.bounds.minlat + el.bounds.maxlat) / 2;
                let avgLon = (el.bounds.minlon + el.bounds.maxlon) / 2;

                // Add pin info to array
                pins.push(el); 
                dropPinAt(avgLat, avgLon, num);
                num++; 

                // Create anchor tag to link to google maps. same reference as the pin. not being used 
                const gmap =  `https://www.google.com/maps/search/?api=1&query=${avgLat}%2C${avgLon}`;
                gmapCoors.push(gmap); 

            }
        });

        // add info to console for debugging 
        console.log("places found."); 
        console.log("pins: ", pins); 

        })
        .catch(err => console.error(err));
    }




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
  zoom: 16,
  placeholder: 'Search or type: lng, lat',
  reverseGeocode: true
});

map.addControl(geocoder);

// Remove the original geocoder.on('result') listener
// and trigger manually on button click


/* drops pin at location, logs reference for pin, adds listener for pin */ 
function dropPinAt(lat, lon, num) {

    // Use  coordinatesGeocoder function to get a Feature object
    const features = coordinatesGeocoder(`${lat}, ${lon}`);
    if (!features || features.length === 0) return;

    const feature = features[0];

    // Create pin and store it in a variable
    const marker = new mapboxgl.Marker({ color: markerColor })
        .setLngLat([lon, lat])
        .addTo(map);

    // WHEN PIN IS CLICKED 
    marker.getElement().addEventListener("click", () => {

        // highlight
        addColoredPin(lon, lat); 
        highlightBuilding(lon, lat);

        displayPinInfo(num); 
        // display data 
        console.log("Pin clicked:", pins[num].tags); // find it in array 

        // fly to pin animation 
        map.flyTo({
            center: [lon, lat],
            zoom: 18, 
             padding: {
                left: 300,   // width of sidebar
                right: 0,
                top: 0,
                bottom: 0
            }
        });

        gMap.addEventListener("click", async () => {
            window.open('https://www.example.com', '_blank');
        }) 

    });
}


    /* Display Pin Info */ 
    function displayPinInfo(num) {
         // display text content
        resultsDiv.style.visibility = "visible";

        let title = [JSON.stringify(pins[num].bounds.minlat), JSON.stringify(pins[num].bounds.minlon)]
        let cont = JSON.stringify(pins[num].tags); 

        resultsDiv.querySelector("h1").textContent = title; 
        resultsDiv.querySelector("p").textContent = cont;   

    }



    // Keep a reference to the last marker
    let lastMarker = null;

    /* add a colored pin at a given coordinate and remove the old one */ 
    function addColoredPin(lon, lat, color = selectedMarkerColour) {
        // Remove the previous marker if it exists
        if (lastMarker) {
            lastMarker.remove();
        }

        // Create a new marker
        const marker = new mapboxgl.Marker({ color: color })
            .setLngLat([lon, lat])
            .addTo(map);

        // Store reference to this marker
        lastMarker = marker;

        return marker;
    }


    /* Fly To Coors */ 
    function zoomIn(lo, la) {  // note: in mapping softwares its switched long, lat is standard 
        
        console.log("zooming"); 
        map.flyTo({
        center: [lo, la],
        zoom: 17,
        pitch: 0
    });
    }


    /* FUNCTION HIGHLIGHTS SELECTED BUILDING */ 
    let lastHighlightedBuildingId = null;
    function highlightBuilding(lng, lat) {

        const point = map.project([lng, lat]);

    const features = map.queryRenderedFeatures(point, {
        layers: ['3d-buildings']
    });

    if (!features || features.length === 0) {
        console.log("No building found at that coordinate");
        return;
    }

    const building = features[0];

    if (!building.id) {
        console.log("Building has no ID (cannot highlight)");
        return;
    }

    // Reset previous highlighted building
    if (lastHighlightedBuildingId !== null) {
        map.setFeatureState(
            {
                source: 'composite',
                sourceLayer: 'building',
                id: lastHighlightedBuildingId
            },
            { selected: false }
        );
    }

    // Highlight new building
    map.setFeatureState(
        {
            source: 'composite',
            sourceLayer: 'building',
            id: building.id
        },
        { selected: true }
    );

    lastHighlightedBuildingId = building.id; // remember new building

}


geocoder.on('result', (e) => {

    const coords = e.result.center; // [lng, lat]

    long = coords[0];
    lat = coords[1];

    console.log("Search result:");
    console.log("Latitude:", lat);
    console.log("Longitude:", long);

    // Move map to new location
    map.flyTo({
        center: [long, lat],
        zoom: 15
    });



    // Call getPlaces with the new lat/lon coordinates 
    getPlaces();
});

    /* Currently not doing anything */ 
    locate.addEventListener("click", async () => {

    if (locate.disabled) return;
    locate.disabled = true;

    console.log("location");

    try {
     // getLocation();   
      //getPlaces();   


    } catch (e) {
        console.log("Location failed.");
        button.disabled = false;  // re-enable button if location fails
    }

    // Move map
   // zoomIn(lat, long); 


});

    document.addEventListener("submit", (e) => {
        e.preventDefault();
    });

    // close the info div button 
    close.addEventListener("click", async () => {
        resultsDiv.style.visibility = "hidden";
    });

};