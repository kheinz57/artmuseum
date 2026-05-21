# Adding Artworks to the Virtual Museum

## How it works

Every painting is described by one entry in **`manifest.json`**.  
The app reads that file at startup and hangs each painting on the correct wall.

---

## Step-by-step: add a new painting

### 1 – Copy the JPEG into this folder

```
artworks/
  my-painting.jpg   ← drop it here
```

### 2 – Know the real dimensions

Measure (or look up) the physical painting size in **metres**.  
A 40 × 50 cm canvas = `width: 0.40, height: 0.50`.

The app automatically scales all paintings so the longest side is
between **1.05 m and 2.40 m** in the 3-D scene, preserving the
original aspect ratio.

### 3 – Add an entry to `manifest.json`

Open `artworks/manifest.json` and append a new object inside the
`"artworks": [ … ]` array:

```json
{
  "id":          "my-painting-01",
  "file":        "artworks/my-painting.jpg",
  "title":       "My Painting Title",
  "artist":      "First Last",
  "year":        "2024",
  "medium":      "Oil on canvas",
  "dimensions":  { "width": 0.40, "height": 0.50 },
  "description": "A short text shown in the info panel.",
  "wall":        "north"
}
```

**Field reference**

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Unique string, no spaces |
| `file` | yes | Relative path or full URL to the JPEG |
| `title` | yes | Displayed in-gallery and in the info panel |
| `artist` | no | Shown in italic gold |
| `year` | no | e.g. `"2024"` |
| `medium` | no | e.g. `"Oil on canvas"` |
| `dimensions.width` | yes | Physical width in **metres** |
| `dimensions.height` | yes | Physical height in **metres** |
| `description` | no | Shown in the info panel |
| `wall` | no | `north` · `east` · `south` · `west`; omit for auto-placement |

---

## Using the existing per-painting JSON format

If you already have a sidecar `.json` file that only contains `{ "width": W, "height": H }`
(the format used by the source images), embed those values directly
in the `dimensions` field of the manifest entry – no extra file is needed.

---

## Remote / URL images

You can use any publicly hosted JPEG:

```json
"file": "https://example.com/images/painting.jpg"
```

> **Note:** Cross-origin images require the server to send
> `Access-Control-Allow-Origin: *`.
> Wikimedia Commons and GitHub raw URLs both support this.

---

## Running the app (required for local files)

Browsers block `fetch()` from `file://` URLs.  
Serve the project root from a local HTTP server:

```bash
# Python 3
python3 -m http.server 8080
# then open http://localhost:8080

# Node (npx)
npx serve .

# VS Code
# Install the "Live Server" extension, right-click index.html → Open with Live Server
```

---

## Controls

| Key / action | Function |
|---|---|
| **W A S D** or arrow keys | Walk |
| **Mouse** | Look around |
| **Left Shift** | Sprint |
| **E** | Examine artwork (when crosshair turns gold) |
| **ESC** | Pause / release mouse |
