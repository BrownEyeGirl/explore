function loadClosed() {

  const bbox = "40.7306,-73.9866,40.7416,-73.9766";

  const query = `
  [out:json][timeout:25];
  (
    node["disused:shop"](${bbox});
    way["disused:shop"](${bbox});
  );
  out center;
  `;

  fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
  })
  .then(res => res.json())
  .then(data => {
    console.log(data);
  });
}

document.getElementById("loadBtn").addEventListener("click", loadClosed);


/*

const query = `
[out:json][timeout:25];
(
  node["disused:shop"](${bbox});
  node["abandoned:shop"](${bbox});
  node["disused:amenity"](${bbox});
  node["abandoned:amenity"](${bbox});
  node["shop"]["disused"="yes"](${bbox});
  node["amenity"]["disused"="yes"](${bbox});
  
  way["disused:shop"](${bbox});
  way["abandoned:shop"](${bbox});
  way["disused:amenity"](${bbox});
  way["abandoned:amenity"](${bbox});
  way["shop"]["disused"="yes"](${bbox});
  way["amenity"]["disused"="yes"](${bbox});
);
out center;
`;
*/