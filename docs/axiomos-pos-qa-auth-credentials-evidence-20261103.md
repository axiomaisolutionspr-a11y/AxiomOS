# POS — Login y credenciales QA, evidencia 2026-11-03

**Autorización:** QA y Preview exclusivamente, no pagos reales ni producción.

## Aplicado

- Credenciales SQL del rol `pos_qa_app_login` configuradas exclusivamente en Neon QA.
- En Vercel se crearon las variables de Preview **limitadas a esta rama**: `POS_QA_DATABASE_URL`, `POS_QA_DATABASE_HOST`, `POS_QA_SESSION_SECRET`, `POS_QA_USERS_JSON` y `POS_QA_ENABLED=false`. No existen valores secretos en GitHub.
- Ruta `app/api/pos/qa/session/route.ts` ahora exige un contador en base de datos antes de comprobar contraseña; máximo 5 solicitudes/ventana fija de 15 minutos por nombre normalizado. La tabla `pos_qa_login_limiter` fue creada previamente en la rama QA.
- Si Neon falla, el login se deniega. Las sesiones usan HMAC firmado, cookie HttpOnly/Secure/SameSite strict y expiración de 4 horas.
- Nota: el límite únicamente por nombre puede bloquear a un operador legítimo si terceros conocen su nombre. Para uso comercial se requiere rate limiting adicional por origen/IP confiable y control de sesión/cuentas.

## Verificado

- Conexión desde un Vercel Sandbox al servidor Neon QA usando `pos_qa_app_login`: `current_user=pos_qa_app_login`, `rolbypassrls=false`.
- RLS SELECT con rol real: sin comercio 0 artículos, comercio A 1, comercio B 0.
- Sin contexto de comercio no aparecen estaciones.
- Orden borrador insertada bajo rol restringido: resultado correcto.
- Reintento de la misma clave idempotente: mismo ID de orden.
- Intentos con comercio equivocado y sin comercio: rechazados por falta de operador autorizado.
- Tabla de limitador: seis inserciones a la misma clave devolvieron 1,2,3,4,5,6; la ruta API rechaza cuando el contador es mayor que 5.
- `npm run build` y ESLint del API QA: éxito.

## No comprobado aún

- No se ha completado el circuito navegador/HTTP→login→catálogo→guardar orden en un Preview con `POS_QA_ENABLED=true`.
- Pruebas de concurrencia, recuperación ante fallas, flujo multi-comercio completo y protección anti abuso a escala.
- Pago bancario, verificación independiente de pagos y fiscalidad siguen sin implementación real.

La cuenta de prueba creada en Vercel tiene credenciales generadas aleatoriamente: deberán regenerarse para operadores humanos antes de pruebas manuales.

**No fusionar a main. El respaldo CRM Neon sigue identificado como `snap-restless-leaf-av4bp0og`.**
