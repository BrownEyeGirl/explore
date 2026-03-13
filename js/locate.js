


window.onload = function () {

    // variables, default values 
    let lat =  45.5017;
    let long = -73.5673; 
    let boundingBoxThreshold = 0.1; 
    let zoomDist = 2; 

    // styling
    let markerColor = "#0800ffff"; 
    let selectedMarkerColour = "cornflowerblue"; 
    let roadsCol = '#68A'; 

    // Pin data storage
    let pins=[]; 
    let gmapCoors = ""; 
    let favs = []; // link to favourite places, add them by their nums identifier (make sure to copy the info, nums identifiers change every reload)
    let num = 0; // to count position

    // Establish div location + declare loading 
    const resultsDiv = document.getElementById("coordinate-results");
    resultsDiv.style.visibility = "hidden"; // immediately hide 
    let googleMap = document.getElementById("gmap-btn")
    

    const close = document.getElementById("close-btn");


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


  // toggle search 
let searchActive = false;

const toggle = document.getElementById("searchToggle");

toggle.addEventListener("click", () => {

  const searchBar = document.querySelector(".mapboxgl-ctrl-geocoder");

  if (!searchActive) {
    searchBar.classList.add("geocoder-visible");
    console.log("search bar: " + searchBar.className); 
    searchActive = true;
  } else {
    searchBar.classList.remove("geocoder-visible");
    searchActive = false;
  }

});

  
  map.addLayer({
  id: 'dark-overlay',
  type: 'background',
  paint: {
    'background-color': '#FFF',  // deep night color
    'background-opacity': 0.6  // adjust for darkness
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
        0,   '#525252',  // shortest → darkest grey
        10,  '#6b6b6b',
        20,  '#858585',
        30,  '#9e9e9e',
        40,  '#b8b8b8',
        50,  '#c2c2c2',
        60,  '#cccccc',
        80,  '#d6d6d6',
        100, '#e0e0e0',
        120, '#ebebeb',
        150, '#f5f5f5'   // tallest → very light grey
]
    ],
    // Use building height from data
    'fill-extrusion-height': ['get', 'height'],
    // Base of the building
    'fill-extrusion-base': ['get', 'min_height'],
    // Full opacity ensures visibility on light maps
    'fill-extrusion-opacity': 1,
    'fill-extrusion-ambient-occlusion-intensity': 0.8
  }


  
  
});
map.getStyle().layers.forEach(layer => {

    if (layer['source-layer'] === 'road') {

        // change road color
        if (map.getPaintProperty(layer.id, 'line-color') !== undefined) {
            map.setPaintProperty(layer.id, 'line-color', roadsCol);
        }

        // move road above overlay
        try {
            map.moveLayer(layer.id);
        } catch(e) {}

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
                gmapCoors =  `https://www.google.com/maps/search/?api=1&query=${avgLat}%2C${avgLon}`;
                

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
  placeholder: '   ',
  reverseGeocode: true
});

map.addControl(geocoder);

let marker = null;

geocoder.on('result', (e) => {

  const coords = e.result.center;
  const lng = coords[0];
  const lat = coords[1];

  map.flyTo({
    center: coords,
    zoom: 17,
    pitch: 60
  });
});

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

        googleMap.addEventListener("click", async () => {
            window.open(gmapCoors, '_blank');
        }) 

    });
}
    /* Display Pin Info */ 
    function displayPinInfo(num) {
         // display text content
        resultsDiv.style.visibility = "visible";

        let title = [JSON.stringify(pins[num].bounds.minlat), JSON.stringify(pins[num].bounds.minlon)]; 
        let cont = JSON.stringify(pins[num].tags); 
       // let contClean = ""; 

       /* cont.forEach(s => {
            if(s) {
                s = s.replace("{", "");
                s = s.replace("}", "");
                s = s.replace()
                s = s + "\n"; 
                contClean+=s;
            }
        }) */

        let overlayH = resultsDiv.querySelector("h1");
        overlayH.textContent = title; 
        let overlayP =resultsDiv.querySelector("p");
        overlayP.textContent = cont;   

        //css for overlay text H
        overlayH.style.position = "absolute";       // overlay
        overlayH.style.top = "30%";                 // center vertically
        overlayH.style.left = "50%";                // center horizontally
        overlayH.style.transform = "translate(-50%, -50%)"; // true center
        overlayH.style.color = "#7d7b7b";
        overlayH.style.fontSize = "100%";
        overlayH.style.textShadow = "0.5px 1px 3px #cececeff"; // improves readability
        overlayH.style.margin = "0";   
        overlayH.style.fontFamily = "IBM Plex Mono";
        overlayH.style.fontWeight = "400";
        overlayH.style.fontStyle = "normal";

        // css for overlay text P
        overlayP.style.position = "absolute";       // overlay
        overlayP.style.top = "50%";                 // center vertically
        overlayP.style.left = "50%";                // center horizontally
        overlayP.style.transform = "translate(-50%, -60%)"; // true center
        overlayP.style.color = "#7d7b7b";
        overlayP.style.fontSize = "70%";
        overlayP.style.textShadow = "0.5px 1px 3px #cececeff"; // improves readability
        overlayP.style.margin = "0";   
        overlayP.style.fontFamily = "IBM Plex Mono";
        overlayP.style.fontWeight = "400";
        overlayP.style.fontStyle = "normal";
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
        marker.getElement().addEventListener("click", () => {

    addColoredPin(lon, lat); 
    highlightBuilding(lon, lat);
    displayPinInfo(num);

    // show 3D model
    document.getElementById("modelViewer").style.display = "block";
    if(!renderer){
initModel();
    }

});

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



    /* Locate button removed */ 
     // Get button element
     //const locate = document.getElementById("locate");
    /* locate.addEventListener("click", async () => {

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


}); */



    document.addEventListener("submit", (e) => {
        e.preventDefault();
    });

     close.addEventListener("click", async () => {

                console.log("entered close button")

        resultsDiv.style.visibility = "hidden";

        // stop 3D viewer
        document.getElementById("modelViewer").style.display = "none";

    });

    

function buildinganimation() {

   

}

let scene, camera, renderer, model;

function initModel(){

console.log("Initializing 3D viewer");

const container = document.getElementById("modelViewer");

scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(
75,
container.clientWidth / container.clientHeight,
0.1,
1000
);

camera.position.z = 5;

// renderer
renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// light
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
scene.add(light);

// loader
const loader = new THREE.GLTFLoader();

console.log("Starting GLB load...");

loader.load(

"assets/abandoned_skyscraper.glb",

function(gltf){

console.log("MODEL SUCCESSFULLY LOADED");
console.log("GLTF DATA:", gltf);

model = gltf.scene;

model.scale.set(10,10,10);

scene.add(model);

},

function(progress){

if(progress.total){
console.log("Loading progress:",
Math.round((progress.loaded / progress.total)*100) + "%");
}else{
console.log("Loading progress:", progress.loaded);
}

},

function(error){

console.error("MODEL FAILED TO LOAD");
console.error(error);

}
);
}
}