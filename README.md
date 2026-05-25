# 🏛 Virtual Art Museum

An immersive, first-person 3D walk-through gallery built with Three.js. This application allows you to explore a curated collection of contemporary paintings in a realistic architectural environment.

## 🚀 Live Demo
Once hosted on GitHub Pages, your link will look like:
`https://kheinz57.github.io/artmuseum/`

## ✨ Features
- **Immersive 3D Environment:** 20m x 16m gallery room with architectural ceiling beams and realistic lighting.
- **Realistic Lighting:** Dimmed gallery atmosphere with individual spotlights for every painting, creating dramatic shadows on light-gray walls.
- **Responsive Controls:** Walk with **WASD**, look with the **Mouse**, and sprint with **Shift**.
- **Interactive Examination:** Aim at any painting and press **E** to enter a high-resolution 2D viewer.
- **Detail Lens:** In the examination view, **Right-Click** to toggle a magnifying glass for close-up inspection of brushstrokes.
- **Dynamic Scaling:** Artworks automatically respect their real-world physical dimensions (specified in meters) from the metadata.

## 🖼 How to Add Your Own Art
It is very easy to expand the gallery:

1.  **Add your image:** Drop a JPEG file into the `artworks/` directory.
2.  **Update the manifest:** Open `artworks/manifest.json` and add a new entry:
    ```json
    {
      "id": "my-new-piece",
      "file": "artworks/painting.jpg",
      "title": "Title of Work",
      "artist": "Artist Name",
      "dimensions": { "width": 0.60, "height": 0.80 },
      "wall": "north"
    }
    ```
    *Note: Dimensions are in meters (e.g., 0.60 = 60cm).*

## 🛠 Local Development
To run this project locally, you must serve it through a web server (fetching JSON and textures requires a server environment):

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js (npx)
npx serve .
```
Then visit `http://localhost:8080`.

## 📦 Tech Stack
- **Three.js:** 3D Engine and rendering.
- **PointerLock API:** First-person navigation.
- **HTML5/CSS3:** UI overlays and 2D viewer.
- **JSON:** Artwork metadata management.

## 📜 License
MIT
