# Migraciones de Base de Datos - EVMinds

## Cómo ejecutar las migraciones en Supabase

### Paso 1: Abrir SQL Editor
1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. En el menú lateral izquierdo, busca el icono **SQL Editor** (</> icono)
3. Click en **"New query"** o **"+ New query"**

### Paso 2: Ejecutar las migraciones EN ORDEN

**Importante:** Ejecuta los archivos **en orden numérico** (01, 02, 03).

#### Migration 1: Tabla `sources`
1. Abre el archivo: `01_create_sources_table.sql`
2. Copia TODO el contenido
3. Pega en el SQL Editor de Supabase
4. Click en **"Run"** o presiona `Ctrl/Cmd + Enter`
5. Verifica que aparezca "Success" ✅

#### Migration 2: Tabla `articles`
1. Abre el archivo: `02_create_articles_table.sql`
2. Copia TODO el contenido
3. Pega en el SQL Editor de Supabase
4. Click en **"Run"**
5. Verifica "Success" ✅

#### Migration 3: Seed data (5 fuentes)
1. Abre el archivo: `03_seed_sources.sql`
2. Copia TODO el contenido
3. Pega en el SQL Editor
4. Click en **"Run"**
5. Deberías ver: `total_sources: 5` ✅

### Paso 3: Verificar las tablas
En el SQL Editor, ejecuta:

```sql
-- Ver todas las fuentes
SELECT * FROM sources;

-- Verificar estructura de articles
SELECT COUNT(*) FROM articles;
```

Deberías ver las 5 fuentes listadas y la tabla articles vacía (0 artículos por ahora).

---

## Siguiente paso

Una vez ejecutadas las migraciones, el siguiente paso es:
1. Configurar Supabase Storage para imágenes
2. Crear el Edge Function scraper

---

**Nota:** Estas migraciones son idempotentes (puedes ejecutarlas múltiples veces sin problemas gracias a `IF NOT EXISTS` y `ON CONFLICT DO NOTHING`).
