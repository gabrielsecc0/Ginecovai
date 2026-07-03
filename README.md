# Casos Clínicos Ginecología — PWA Navy & Gold

Esta carpeta contiene una Progressive Web App estática para estudiar los casos clínicos.

## Abrir como archivo
Puedes abrir `index.html` directamente. La app funcionará, pero el modo instalable/offline con Service Worker puede no activarse por restricciones del navegador con `file://`.

## Abrir como PWA real en tu computadora
1. Descomprime el ZIP.
2. Abre una terminal dentro de la carpeta.
3. Ejecuta:

```bash
python3 -m http.server 8000
```

4. Abre en el navegador:

```text
http://localhost:8000
```

5. Toca **Instalar** o usa el menú del navegador para instalar la app.

## Para iPad/iPhone
Sube la carpeta a un hosting HTTPS simple, por ejemplo GitHub Pages, Netlify, Vercel o el servidor de tu facultad. Luego abre la URL en Safari y usa **Compartir → Agregar a pantalla de inicio**.

## Contenido
- Fuente: Practicos_Casos_Clinicos_Gineco.docx
- Casos: 38
- Preguntas: 216
- Diseño: Secco Core Navy & Gold
- Función central: mostrar solo la respuesta seleccionada
