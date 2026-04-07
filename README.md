# Portal Interno — Corso Arquitectura

Escritorio digital interno para Corso Arquitectura. Dashboard elegante que centraliza acceso a todos los sistemas: RSAO, vacaciones, cambios, etc.

## 🎨 Diseño

- **Paleta**: Negro cálido (#211F20) con acentos crema (#EDE9E0)
- **Tipografía**: Cormorant Garamond (títulos), Inter (cuerpo)
- **Tema**: Minimalismo de lujo, animaciones suaves
- **Responsive**: Móvil, tablet, desktop

## 🚀 Estructura

```
/app
  layout.tsx      — Header global + Footer
  page.tsx        — Homepage con todas las áreas
  globals.css     — Estilos globales

/components
  Greeting.tsx    — Saludo dinámico (Buenos días/tardes/noches)
  AreaSection.tsx — Sección por área (RH, Operaciones)
  AppCard.tsx     — Tarjeta individual de app

/public
  (favicon, logos, etc.)
```

## 📦 Stack

- **Next.js 14** (App Router)
- **Tailwind CSS 3.4** (estilos)
- **TypeScript** (type safety)

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000

# Build para producción
npm run build
npm start
```

## 📱 Apps Integradas

### Recursos Humanos
- 🏖 **Solicitud de Vacaciones** — Google Apps Script
- 🔄 **Cambios y Reposiciones** — Google Form
- 📋 **Evaluación de Desempeño** — (Próximamente)
- 👤 **Alta / Baja de Personal** — (Próximamente)

### Operaciones de Obra
- 📊 **Control RSAO** — Google Sheets
- 📁 **Drive — Archivo** — Google Drive

## 🚢 Deploy en Vercel

1. **Empuja a GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/corso-portal.git
   git push -u origin main
   ```

2. **Import en Vercel**:
   - Ve a vercel.com
   - Click "New Project"
   - Selecciona el repo `corso-portal`
   - Vercel auto-detecta Next.js
   - Click "Deploy"

3. **Configura dominio personalizado**:
   - En Vercel, ve a "Settings > Domains"
   - Agrega `interno.corsoarquitectura.com`
   - Sigue instrucciones para agregar record DNS en tu registrador

## 📝 Próximos Pasos

- [ ] Autenticación Google (@corsoarquitectura.com)
- [ ] Dashboard admin (crear/editar apps)
- [ ] Notificaciones en tiempo real
- [ ] Integración con WhatsApp API
- [ ] Dark mode toggle (ya está implementado implícitamente)

## 🔐 Seguridad

- URLs públicas: Google Apps Script, Google Forms, Sheets, Drive (acceso por dominio donde sea posible)
- Autenticación: Implementar Google OAuth2 para acceso interno

---

**Hecho por Enrique Morris**  
Corso Arquitectura, 2026
