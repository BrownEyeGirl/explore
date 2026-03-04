


window.onload = function () {

    // variables, default values 
    let long = 45.5017;
    let lat = -73.5673; 
    let boundingBoxThreshold = 0.3; 
    let zoomDist = 2; 


    // Create button element
    const button = document.createElement("button");

    // Set id (so CSS can style it)
    button.id = "locBtn";

    // Set text
    button.textContent = "Find cool spots near me";

    // Add to page
    document.body.appendChild(button);


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
        
        // Establish div location + declare loading 
        const resultsDiv = document.getElementById("coordinate-results");
        

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
            
            data.elements.forEach(el => {
            if (el.type === "way" && el.bounds) {

                // Get average location for each element
                const avgLat = (el.bounds.minlat + el.bounds.maxlat) / 2;
                const avgLon = (el.bounds.minlon + el.bounds.maxlon) / 2;

                // Create paragraph
                const p = document.createElement("p");

                // Create anchor tag to link to google maps
                const a = document.createElement("a");
                a.href = `https://www.google.com/maps/search/?api=1&query=${avgLat}%2C${avgLon}`;//`https://www.google.com/maps/@${avgLat},${avgLon},${zoomDist}z`;   // same link for all
                a.target = "_blank";                        // opens in new tab
                a.textContent = `Building ${el.id}: ${avgLat}, ${avgLon}`;

                // Put <a> inside <p>
                p.appendChild(a);

                // Add to page
                resultsDiv.appendChild(p);
            }
        });
        console.log("places found."); 
           // console.log(data.elements); // check if we got geometry

        })
        .catch(err => console.error(err));
    }


    /* Add Button Triggers */ 
    button.addEventListener("click", () => {
        console.log("location")
        getLocation();
        getPlaces(); 
        // later:
        // getLocation();
    });



};