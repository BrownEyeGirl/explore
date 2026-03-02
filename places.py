import requests
import folium

# Montreal bounding box
min_lat, min_lon = 45.45, -73.70
max_lat, max_lon = 45.65, -73.50

overpass_url = "https://overpass.kumi.systems/api/interpreter"

# Overpass query for abandoned buildings
query = f"""
[out:json][timeout:180];
(
  way["building"]["abandoned"="yes"]({min_lat},{min_lon},{max_lat},{max_lon});
);
out body geom;
"""

# Get data from Overpass API
response = requests.get(overpass_url, params={'data': query})
data = response.json()

# Create map centered on Montreal
m = folium.Map(location=[45.5017, -73.5673], zoom_start=12)

for element in data.get("elements", []):
    if element["type"] == "way" and "geometry" in element:
        coords = [(point["lat"], point["lon"]) for point in element.get("geometry", [])]

        # Check for images
        tags = element.get("tags", {})
        image_url = tags.get("image") or tags.get("wikimedia_commons")

        # Popup HTML
        popup_html = ""
        if image_url:
            popup_html = f'<img src="{image_url}" width="250">'
        else:
            popup_html = "No image available"

        # Add polygon with popup
        folium.Polygon(
            locations=coords,
            color="red",
            fill=True,
            fill_opacity=0.5,
            popup=folium.Popup(popup_html, max_width=300)
        ).add_to(m)

# Save map to HTML
m.save("montreal_abandoned_buildings_with_images.html")
print("Map saved as montreal_abandoned_buildings_with_images.html")