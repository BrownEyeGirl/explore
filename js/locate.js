import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.onload = function () {

    // variables
    let lat = 45.5017;
    let long = -73.5673;
    let boundingBoxThreshold = 0.1;
    let markerColor = "#0800ffff";
    let selectedMarkerColour = "cornflowerblue";
    let roadsCol = '#68A';

    // pin data
    let pins = [];
    let gmapCoors = "";
    let num = 0;

    // DOM elements
    const resultsDiv = document.getElementById("coordinate-results");
    resultsDiv.style.visibility = "hidden";
    const googleMap = document.getElementById("gmap-btn");

    

    // append h1 and p to resultsDiv
    let nameEl = document.createElement("h1");
    resultsDiv.appendChild(nameEl);
    let infoEl = document.createElement("p");
    resultsDiv.appendChild(infoEl);

    // 3D model vars
    let scene, camera, renderer, model;

    getPlaces();

    // MAP SETUP
    mapboxgl.accessToken = 'pk.eyJ1IjoiYWJoaXZvbGV0aSIsImEiOiJjbW05cWV4ZTEwNXJtMnVwdjNyNmg3YmtzIn0.18DTC_mGG-07zo8XgcOgXg';

    const map = new mapboxgl.Map({
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
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
                showUserHeading: false
            }),
            "bottom-left"
        );

        // search toggle
        let searchActive = false;
        const toggle = document.getElementById("searchToggle");
        toggle.addEventListener("click", () => {
            const searchBar = document.querySelector(".mapboxgl-ctrl-geocoder");
            searchActive = !searchActive;
            searchBar.classList.toggle("geocoder-visible", searchActive);
        });

        map.addLayer({
            id: 'dark-overlay',
            type: 'background',
            paint: {
                'background-color': '#FFF',
                'background-opacity': 0.6
            }
        }, 'waterway-label');

        map.setLayoutProperty('poi-label', 'visibility', 'none');

        map.addLayer({
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 0,
            paint: {
                'fill-extrusion-color': [
                    'case',
                    ['boolean', ['feature-state', 'selected'], false],
                    '#4DA6FF',
                    [
                        'interpolate', ['linear'], ['get', 'height'],
                        0,   '#525252',
                        10,  '#6b6b6b',
                        20,  '#858585',
                        30,  '#9e9e9e',
                        40,  '#b8b8b8',
                        50,  '#c2c2c2',
                        60,  '#cccccc',
                        80,  '#d6d6d6',
                        100, '#e0e0e0',
                        120, '#ebebeb',
                        150, '#f5f5f5'
                    ]
                ],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 1,
                'fill-extrusion-ambient-occlusion-intensity': 0.8
            }
        });

        map.getStyle().layers.forEach(layer => {
            if (layer['source-layer'] === 'road') {
                if (map.getPaintProperty(layer.id, 'line-color') !== undefined) {
                    map.setPaintProperty(layer.id, 'line-color', roadsCol);
                }
                try { map.moveLayer(layer.id); } catch(e) {}
            }
        });
    });

    // GET PLACES
    function getPlaces() {
        console.log("places loading...");

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

        fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        .then(data => {
            data.elements.forEach(el => {
                if (el.type === "way" && el.bounds) {
                    let avgLat = (el.bounds.minlat + el.bounds.maxlat) / 2;
                    let avgLon = (el.bounds.minlon + el.bounds.maxlon) / 2;
                    pins.push(el);
                    dropPinAt(avgLat, avgLon, num);
                    num++;
                    gmapCoors = `https://www.google.com/maps/search/?api=1&query=${avgLat}%2C${avgLon}`;
                }
            });
            console.log("places found.", pins);
        })
        .catch(err => console.error(err));
    }

    // GEOCODER
    const coordinatesGeocoder = function (query) {
        const matches = query.match(
            /^[ ]*(?:Lat: )?(-?\d+\.?\d*)[, ]+(?:Lng: )?(-?\d+\.?\d*)[ ]*$/i
        );
        if (!matches) return null;

        function coordinateFeature(lng, lat) {
            return {
                center: [lng, lat],
                geometry: { type: 'Point', coordinates: [lng, lat] },
                place_name: 'Lat: ' + lat + ' Lng: ' + lng,
                place_type: ['coordinate'],
                type: 'Feature'
            };
        }

        const coord1 = Number(matches[1]);
        const coord2 = Number(matches[2]);
        const geocodes = [];

        if (coord1 < -90 || coord1 > 90) geocodes.push(coordinateFeature(coord1, coord2));
        if (coord2 < -90 || coord2 > 90) geocodes.push(coordinateFeature(coord2, coord1));
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

    geocoder.on('result', (e) => {
        const coords = e.result.center;
        long = coords[0];
        lat = coords[1];
        console.log("Search result - Lat:", lat, "Lng:", long);
        map.flyTo({ center: [long, lat], zoom: 15 });
        getPlaces();
    });

    // DROP PIN
    function dropPinAt(lat, lon, num) {
        const features = coordinatesGeocoder(`${lat}, ${lon}`);
        if (!features || features.length === 0) return;

        const marker = new mapboxgl.Marker({ color: markerColor })
            .setLngLat([lon, lat])
            .addTo(map);

        marker.getElement().addEventListener("click", () => {
            addColoredPin(lon, lat);
            highlightBuilding(lon, lat);
            displayPinInfo(num);
            console.log("Pin clicked:", pins[num].tags);

            // show model viewer and init if first time
            const viewer = document.getElementById("modelViewer");
            viewer.style.display = "block";
            if (!renderer) initModel();

            map.flyTo({
                center: [lon, lat],
                zoom: 18,
                padding: { left: 300, right: 0, top: 0, bottom: 0 }
            });

            googleMap.addEventListener("click", () => {
                window.open(gmapCoors, '_blank');
            });
        });
    }

    // DISPLAY PIN INFO — all your original DOM styling kept exactly
    function displayPinInfo(num) {

        resultsDiv.style.visibility = "visible";
       document.getElementById("coordinate-results").style.display = "block";

        let title = [JSON.stringify(pins[num].bounds.minlat), JSON.stringify(pins[num].bounds.minlon)];
        let cont = JSON.stringify(pins[num].tags);

        let overlayH = resultsDiv.querySelector("h1");
        overlayH.textContent = title;
        overlayH.style.position = "absolute";
        overlayH.style.top = "30%";
        overlayH.style.left = "50%";
        overlayH.style.transform = "translate(-50%, -50%)";
        overlayH.style.color = "#7d7b7b";
        overlayH.style.fontSize = "100%";
        overlayH.style.textShadow = "0.5px 1px 3px #cececeff";
        overlayH.style.margin = "0";
        overlayH.style.fontFamily = "IBM Plex Mono";
        overlayH.style.fontWeight = "400";
        overlayH.style.fontStyle = "normal";

        let overlayP = resultsDiv.querySelector("p");
        overlayP.textContent = cont;
        overlayP.style.position = "absolute";
        overlayP.style.top = "50%";
        overlayP.style.left = "50%";
        overlayP.style.transform = "translate(-50%, -60%)";
        overlayP.style.color = "#7d7b7b";
        overlayP.style.fontSize = "70%";
        overlayP.style.textShadow = "0.5px 1px 3px #cececeff";
        overlayP.style.margin = "0";
        overlayP.style.fontFamily = "IBM Plex Mono";
        overlayP.style.fontWeight = "400";
        overlayP.style.fontStyle = "normal";
    }

    // COLORED PIN
    let lastMarker = null;

    function addColoredPin(lon, lat, color = selectedMarkerColour) {
        if (lastMarker) lastMarker.remove();

        const marker = new mapboxgl.Marker({ color: color })
            .setLngLat([lon, lat])
            .addTo(map);

        lastMarker = marker;

        marker.getElement().addEventListener("click", () => {
            addColoredPin(lon, lat);
            highlightBuilding(lon, lat);
            displayPinInfo(num);
            document.getElementById("modelViewer").style.display = "block";
            if (!renderer) initModel();
        });

        return marker;
    }

    // HIGHLIGHT BUILDING
    let lastHighlightedBuildingId = null;

    function highlightBuilding(lng, lat) {
        const point = map.project([lng, lat]);
        const features = map.queryRenderedFeatures(point, { layers: ['3d-buildings'] });

        if (!features || features.length === 0) {
            console.log("No building found at that coordinate");
            return;
        }

        const building = features[0];
        if (!building.id) {
            console.log("Building has no ID (cannot highlight)");
            return;
        }

        if (lastHighlightedBuildingId !== null) {
            map.setFeatureState(
                { source: 'composite', sourceLayer: 'building', id: lastHighlightedBuildingId },
                { selected: false }
            );
        }

        map.setFeatureState(
            { source: 'composite', sourceLayer: 'building', id: building.id },
            { selected: true }
        );

        lastHighlightedBuildingId = building.id;
    }

    // CLOSE BUTTON
    const close = document.getElementById("close-btn");
     close.addEventListener("click", async () => {

                console.log("entered close button")

        resultsDiv.style.visibility = "hidden";

        // stop 3D viewer
        document.getElementById("modelViewer").style.display = "none";

    });


    document.addEventListener("submit", (e) => e.preventDefault());

    // 3D MODEL — single clean initModel using imported GLTFLoader
    function initModel() {
        console.log("Initializing 3D viewer");

        const container = document.getElementById("modelViewer");

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 6;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        const light = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
        scene.add(light);

        const loader = new GLTFLoader();
        console.log("Starting GLB load...");

        loader.load(
            "assets/numb.glb",
            function (gltf) {
                console.log("MODEL SUCCESSFULLY LOADED");
                model = gltf.scene;
                model.scale.set(0.077, 0.098, 0.1);
                model.position.y = -1;
                scene.add(model);

                function animate() {
                    requestAnimationFrame(animate);
                    model.rotation.y += 0.01;
                    renderer.render(scene, camera);
                }
                animate();
            },
            function (progress) {
                if (progress.total) {
                    console.log("Loading:", Math.round((progress.loaded / progress.total) * 100) + "%");
                } else {
                    console.log("Loading progress:", progress.loaded);
                }
            },
            function (error) {
                console.error("MODEL FAILED TO LOAD", error);
            }
        );
    }
    
}