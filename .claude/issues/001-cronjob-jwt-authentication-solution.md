# 🔧 Solución del Problema del Cronjob

## 📊 Resumen del Diagnóstico

### ✅ Lo que funciona:
- Base de datos conecta correctamente
- Edge Function `scrape` está desplegada (v5, activa)
- Últimos artículos scrapeados: **2026-03-15 23:23:59 UTC** (hace 9h)

### ❌ Problema identificado:
**La variable de entorno `SCRAPE_SECRET` NO está configurada en Supabase Edge Functions**

**Resultado**: Los cronjobs fallan con error `401 Unauthorized` al intentar llamar a la función.

---

## 🎯 Solución (3 pasos)

### 1. Configurar SCRAPE_SECRET en Supabase

1. Ve a: [Supabase Dashboard](https://supabase.com/dashboard/project/pjpfsclekrvsvwftpkyv)
2. Navega a: **Edge Functions** → **scrape** → **Secrets** (o Settings)
3. Agrega una nueva variable:
   ```
   Nombre: SCRAPE_SECRET
   Valor: evminds_scraper_2026_secure_token_f8a3b9c2
   ```
4. **Guarda** los cambios

### 2. Verificar que la función acepta el token

Ejecuta desde la terminal:

```bash
pnpm run verify
```

**Resultado esperado**:
```
3️⃣  Testing Edge Function...
   ✅ Edge Function is working!
```

**Si aún devuelve 401**:
- Espera 30 segundos y vuelve a intentar
- Verifica que copiaste el token exactamente (sin espacios)

### 3. Esperar al próximo cronjob

Los cronjobs están programados para:
- **07:00 UTC** (08:00 CET / 09:00 CEST)
- **11:00 UTC** (12:00 CET / 13:00 CEST)
- **15:00 UTC** (16:00 CET / 17:00 CEST)
- **17:00 UTC** (18:00 CET / 19:00 CEST)

Espera al próximo horario y verifica con:

```bash
pnpm run verify
```

Los artículos deberían tener `scraped_at` actualizado.

---

## 🔍 Verificación Manual

Si quieres forzar un scraping ahora (sin esperar al cronjob):

```bash
curl -X POST https://pjpfsclekrvsvwftpkyv.supabase.co/functions/v1/scrape \
  -H "Authorization: Bearer evminds_scraper_2026_secure_token_f8a3b9c2" \
  -H "Content-Type: application/json"
```

**Respuesta esperada**:
```json
{
  "success": true,
  "results": [
    { "source": "electrek.co", "count": 5 },
    { "source": "cnevpost.com", "count": 3 }
  ],
  "timestamp": "2026-03-16T..."
}
```

---

## 🛠️ Comandos útiles

```bash
# Verificar estado del sistema
pnpm run verify

# Ver logs de la Edge Function en Supabase Dashboard
Supabase Dashboard → Edge Functions → scrape → Logs

# Verificar artículos en la base de datos (SQL Editor)
SELECT title, scraped_at, category
FROM articles
ORDER BY scraped_at DESC
LIMIT 10;

# Ver ejecuciones de cronjobs (SQL Editor)
SELECT *
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## 📝 Notas importantes

1. **Cache de Astro**: El loader tiene un cache de 5 minutos. Después de un scraping exitoso, espera 5 minutos y haz hard refresh (Ctrl+Shift+R).

2. **Zona horaria**: Los cronjobs usan UTC. En España:
   - Invierno (CET): UTC +1
   - Verano (CEST): UTC +2

3. **Duplicados**: El scraper automáticamente salta artículos duplicados (por `article_url`).

---

## ✅ Checklist final

- [ ] Variable `SCRAPE_SECRET` configurada en Supabase
- [ ] Edge Function responde sin error 401
- [ ] Esperado al próximo horario de cronjob
- [ ] Artículos nuevos aparecen en `pnpm run verify`
- [ ] Web actualizada (después de 5 min + hard refresh)

---

**¿Problema resuelto?** Una vez configurado el `SCRAPE_SECRET`, todo debería funcionar automáticamente.
