# Eldoria: The Last Survivor

Game survival 2D fantasy adventure berbasis browser. Dibangun dengan HTML5 Canvas, CSS, JavaScript ES modules, dan Vite.

## Fitur
- Top-down 2D pixel-art style rendering
- Desktop keyboard controls dan mobile touch controls
- Player health, hunger, stamina
- Resource gathering: wood, stone, berries
- Crafting: stone axe, ironwood blade, campfire kit
- Slime enemy AI, combat, day/night cycle
- Inventory, objective tracker, save/load LocalStorage
- Responsive layout

## Persyaratan
- Node.js 18 atau lebih baru
- npm

## Menjalankan secara lokal
```bash
npm install
npm run dev
```
Buka alamat lokal yang ditampilkan Vite (umumnya http://localhost:5173).

## Build production
```bash
npm run build
npm run preview
```
Hasil build berada di folder `dist/`.

## Kontrol
| Aksi | Desktop | Mobile |
|---|---|---|
| Bergerak | WASD / Arrow | D-pad |
| Serang | Space | Attack |
| Kumpulkan resource | E | Gather |
| Makan berry | F | Eat |
| Crafting | Panel Crafting / C | Panel Crafting |
| Save | Tombol Save | Tombol Save |

## Deployment
### Netlify
1. Push folder project ke GitHub.
2. Import repository di Netlify.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy.

### Vercel
1. Import repository ke Vercel.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Deploy.

### GitHub Pages
Atur `base` pada `vite.config.js` sesuai nama repository, lalu build dan deploy folder `dist` menggunakan GitHub Actions atau Pages.

## Struktur folder
```text
eldoria-survival/
├── index.html
├── package.json
├── README.md
└── src/
    ├── main.js
    └── style.css
```

## Catatan pengembangan
Game ini adalah fondasi playable tingkat menengah, dengan bentuk karakter dan objek digambar secara procedural menggunakan Canvas. Untuk produksi komersial, ganti placeholder procedural dengan sprite sheet original, tambahkan audio, collision map, balancing, accessibility, dan pengujian lintas perangkat.
