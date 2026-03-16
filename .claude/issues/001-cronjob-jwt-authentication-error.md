# Diagnóstico Cronjob - Scraper de Noticias

Este documento te ayudará a diagnosticar por qué el cronjob no está ejecutando el scraping.

## 1️⃣ Verificar si los Cronjobs están configurados

**Ve a**: Supabase Dashboard → SQL Editor

**Ejecuta esta query**:
```sql
SELECT * FROM cron.job;
```

### ¿Qué esperar?
- **Si devuelve 4 filas**: Los cronjobs están configurados ✅
- **Si devuelve 0 filas o error**: Los cronjobs NO están configurados ❌

Si NO están configurados, necesitas ejecutar el archivo:
`supabase/migrations/06_setup_cron_jobs.sql` en el SQL Editor.

---

## 2️⃣ Verificar ejecuciones de los cronjobs

**Ve a**: Supabase Dashboard → SQL Editor

**Ejecuta esta query**:
```sql
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### ¿Qué esperar?
- **Si hay registros recientes (hoy a las 07:00 UTC)**: El cronjob SÍ se está ejecutando ✅
- **Si NO hay registros o son muy antiguos**: El cronjob NO se está ejecutando ❌
- **Si `status` es `failed`**: Revisa el `return_message` para ver el error

---

## 3️⃣ Verificar últimos artículos en la base de datos

**Ve a**: Supabase Dashboard → SQL Editor

**Ejecuta esta query**:
```sql
SELECT
  id,
  title,
  category,
  scraped_at,
  published_at,
  source_id
FROM articles
ORDER BY scraped_at DESC
LIMIT 10;
```

### ¿Qué esperar?
- **Si `scraped_at` es de hoy**: Los artículos SÍ se están scrapeando ✅
- **Si `scraped_at` es antiguo (días/semanas)**: El scraping NO está funcionando ❌

---

## 4️⃣ Probar manualmente la Edge Function

**Desde tu terminal**, ejecuta:

```bash
curl -X POST https://pjpfsclekrvsvwftpkyv.supabase.co/functions/v1/scrape \
  -H "Authorization: Bearer evminds_scraper_2026_secure_token_f8a3b9c2" \
  -H "Content-Type: application/json"
```

### ¿Qué esperar?
- **Si devuelve JSON con `success: true`**: La función funciona ✅
- **Si devuelve error 401**: El token de autenticación está mal ❌
- **Si devuelve error 404**: La función no está desplegada ❌
- **Si devuelve error 500**: Hay un error en el código de la función ❌

---

## 5️⃣ Verificar logs de la Edge Function

**Ve a**: Supabase Dashboard → Edge Functions → `scrape` → Logs

### ¿Qué buscar?
- Errores recientes en la ejecución
- Si hay llamadas a las 07:00 UTC
- Mensajes de error específicos

---

## 6️⃣ Verificar variables de entorno de la Edge Function

**Ve a**: Supabase Dashboard → Edge Functions → `scrape` → Settings

### Verifica que estas variables estén configuradas:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SCRAPE_SECRET` = `evminds_scraper_2026_secure_token_f8a3b9c2`
- `OPENAI_API_KEY`

---

## 7️⃣ Verificar que Astro esté usando datos frescos

El cache de Astro Live Collections es de **5 minutos**.

Para forzar una actualización:
1. Espera 5 minutos después de un scraping exitoso
2. Recarga la página con **Ctrl+Shift+R** (hard refresh)
3. O limpia la cache de Netlify si está activo

---

## 🔍 Resumen de posibles problemas

| Problema | Síntoma | Solución |
|----------|---------|----------|
| **Cronjobs no configurados** | `SELECT * FROM cron.job;` devuelve 0 filas | Ejecutar `06_setup_cron_jobs.sql` |
| **Edge Function no desplegada** | Curl devuelve 404 | Ejecutar `supabase functions deploy scrape` |
| **Variables de entorno faltantes** | Error 500 en logs | Configurar variables en Supabase Dashboard |
| **Token incorrecto** | Error 401 | Verificar `SCRAPE_SECRET` en variables de entorno |
| **Cache de Astro** | Datos antiguos en web | Esperar 5 minutos + hard refresh |
| **pg_cron no habilitado** | Error al ejecutar queries cron | Ejecutar `CREATE EXTENSION IF NOT EXISTS pg_cron;` |

---

## 📋 Próximos pasos

Una vez que identifiques el problema con estos pasos, podremos aplicar la solución correcta.

**Ejecuta las verificaciones en orden y reporta qué encontraste.**
