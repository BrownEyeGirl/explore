


window.onload = function () {

    // variables, default values 
    let long = 45.5017;
    let lat = -73.5673; 
    let boundingBoxThreshold = 0.05; 
    let zoomDist = 2; 

    // Pin data storage
    let pins=[]; 
    let gmapCoors = []; 
    let num = 0; // to count position

    // Get button element
    const button = document.getElementById("locate"); 
    console.log(button); 

    // Establish div location + declare loading 
    const resultsDiv = document.getElementById("coordinate-results");
    let close = document.createElement("button"); 
    close.textContent="x"; 
    resultsDiv.appendChild(close); 
    let name = document.createElement("h1"); 
    resultsDiv.appendChild(name); 
    let info = document.createElement("p"); 
    resultsDiv.appendChild(info); 


    resultsDiv.style.visibility = "hidden";




    /* Create Map */ 
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

// zoom in the centre


  // 3D BUILDINGS
  map.addLayer({
     id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 4,
    paint: {
      'fill-extrusion-color': [
         'case',
      ['boolean', ['feature-state', 'selected'], false],
      '#FFF', 
        '#111'
      ],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 1
    }
  });

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
        
        // Overpass query (out body -> returns array of all body data, geom -> returns array of all coordinates listed for a spot) // less accurate results -> way["disused"="yes"] (${long-boundingBoxThreshold},${lat-boundingBoxThreshold},${long+boundingBoxThreshold},${lat+boundingBoxThreshold});
        console.log("places loading..."); 

        // gets different types of data from the api, gives location range of 2*boundingBoxThreshold 
        const query = `
        [out:json][timeout:180];
        (
            way["building"]["abandoned"="yes"](${long-boundingBoxThreshold},${lat-boundingBoxThreshold},${long+boundingBoxThreshold},${lat+boundingBoxThreshold}); 
            way["leisure"="skate_park"] (${long-boundingBoxThreshold},${lat-boundingBoxThreshold},${long+boundingBoxThreshold},${lat+boundingBoxThreshold}); 
            way["building"="abandoned"] (${long-boundingBoxThreshold},${lat-boundingBoxThreshold},${long+boundingBoxThreshold},${lat+boundingBoxThreshold}); 
            way["ruins"="*"] (${long-boundingBoxThreshold},${lat-boundingBoxThreshold},${long+boundingBoxThreshold},${lat+boundingBoxThreshold}); 
            );
        out body geom; 
        `;

        // Fetch from Overpass API (if code stops returning coordinates, its because there is an issue with this)
        fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded' 
            },
            body: 'data=' + encodeURIComponent(query) // body defined as data=[our overpass query here, URL-encoded]
        })
        .then(r => r.json()) // when the fetch request finishes, this takes the response and convert it into usable JSON.
        .then(data => { // take usable JSOn file, store it as the name "data",  and run this function to extract different classifications of data


            // adds each data to a pins array, drops pin at each location 
            data.elements.forEach(el => {
            if (el.type === "way" && el.bounds) {

                // Get average location for each element
                let avgLat = (el.bounds.minlat + el.bounds.maxlat) / 2;
                let avgLon = (el.bounds.minlon + el.bounds.maxlon) / 2;

                // Add pin info to array 
                pins.push(el); 
                dropPinAt(avgLon, avgLat, num);
                num++; 

                // Create paragraph
                //

                // Create anchor tag to link to google maps. same reference as the pin 
                const gmap =  `https://www.google.com/maps/search/?api=1&query=${avgLat}%2C${avgLon}`;
                gmapCoors.push(gmap); 
                
                //a.href = "#" 
                // a.href = `zoomIn(${avgLat}, ${avgLon})`; // to google maps: `https://www.google.com/maps/search/?api=1&query=${avgLat}%2C${avgLon}`;//`https://www.google.com/maps/@${avgLat},${avgLon},${zoomDist}z`;   // same link for all
                
                //a.target = "_blank"; 
                //let shortLat = avgLat.toFixed(3); 
                //let shortLon = avgLon.toFixed(3);                // opens in new tab
               // a.textContent = `Lat ${shortLat}, Lon ${shortLon} \n`;

               // a.addEventListener("click", (e) => {
                  //  e.preventDefault();             // prevent page jump
                   // zoomIn(avgLon, avgLat);         // call your function
               // });

                // Put <a> inside <p>
               // p.appendChild(a);

                // Add to page
              //  resultsDiv.appendChild(p);
            }
            //zoomIn(avgLat, avgLon); 
        });
        console.log("places found."); 

        console.log("pins: ", pins); 

        
        // show results div 
        resultsDiv.style.visibility = "visible";

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


   function dropPinAt(lng, lat, num) {

    // Use your coordinatesGeocoder function to get a Feature object
    const features = coordinatesGeocoder(`${lat}, ${lng}`);
    if (!features || features.length === 0) return;

    const feature = features[0];

    // Create pin and store it in a variable
    const marker = new mapboxgl.Marker({ color: "#ff0000" })
        .setLngLat([lng, lat])
        .addTo(map);

    // WHEN PIN IS CLICKED 
    marker.getElement().addEventListener("click", () => {

        // highlight
        addColoredPin(lng, lat); 
        highlightBuilding(lng, lat);

        // display data 
        console.log("Pin clicked:", pins[num].tags); // find it in array 

        let title = [JSON.stringify(pins[num].bounds.minlat), JSON.stringify(pins[num].bounds.minlon)]
        let cont = JSON.stringify(pins[num].tags); 

       // resultsDiv.textContent = cont; 

        resultsDiv.querySelector("h1").textContent = title; 
        resultsDiv.querySelector("p").textContent = cont;   

        // display text content
        resultsDiv.style.visibility = "visible";


        map.flyTo({
            center: [lng, lat],
            zoom: 18, 
             padding: {
                left: 300,   // width of your sidebar
                right: 0,
                top: 0,
                bottom: 0
            }
        });
    });
}

    // Keep a reference to the last marker
    let lastMarker = null;

    // Function to add a colored pin at a given coordinate and remove the old one
    function addColoredPin(lng, lat, color = "#0000ffff") {
        // Remove the previous marker if it exists
        if (lastMarker) {
            lastMarker.remove();
        }

        // Create a new marker
        const marker = new mapboxgl.Marker({ color: color })
            .setLngLat([lng, lat])
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

    /* Add Button Triggers */ 
    button.addEventListener("click", async () => {

    if (button.disabled) return;
    button.disabled = true;


    console.log("location");

    try {
        getLocation();   
      getPlaces();   


    } catch (e) {
        console.log("Location failed.");
        button.disabled = false;  // re-enable button if location fails
    }

    // Move map
   // zoomIn(lat, long); 


});

    // close the info div button 
    close.addEventListener("click", async () => {
        resultsDiv.style.visibility = "hidden";
    }) 


};