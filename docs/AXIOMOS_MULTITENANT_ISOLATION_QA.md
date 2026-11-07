# AxiomOS Autopilot — aislamiento entre empresas, prueba QA

Fecha: 2026-11-07. Esta es una prueba de seguridad aislada, **no** una habilitación comercial multiempresa.

## Entorno y recuperación

- Rama Neon hija `br-falling-meadow-avl2ccba`, creada desde la rama QA de almacenamiento `br-little-wildflower-avzintxi` en el punto `0/4941DF8`. La rama padre conserva el panel QA vigente. Base `axiomos_offers_qa`.
- Migración aditiva: `database/migrations/20261107_axiomos_multitenant_isolation_qa.sql`. Crea un esquema propio y dos empresas ficticias; no modifica las tablas del CRM ni los webhooks.
- Roles `axiomos_mtqa_a_reader` y `axiomos_mtqa_b_reader`: NOLOGIN. Roles de prueba con LOGIN provisionados en esta rama mediante Neon, acceso `read_only` limitado a `axiomos_multitenant_qa`; cada uno hereda **solo** su correspondiente rol lector. Las credenciales no se guardan en el repositorio.
- Después de provisionar los roles LOGIN `axiomos_mtqa_a_login` y `axiomos_mtqa_b_login` con ese alcance, se ejecutaron `GRANT axiomos_mtqa_a_reader TO axiomos_mtqa_a_login` y `GRANT axiomos_mtqa_b_reader TO axiomos_mtqa_b_login` en esta rama. No se concede el rol opuesto.
- Reversión: no conectar esta rama al panel; abandonar la rama hija. No es necesario ejecutar una migración inversa en la rama padre.

## Evidencia observada

Las siguientes comprobaciones se ejecutaron usando las conexiones **reales de los roles de prueba**, no una sesión del propietario que simula `SET ROLE`:

| Comprobación | Empresa A | Empresa B |
| --- | --- | --- |
| `row_security_active` | `true` | `true` |
| Fila propia visible | `qa-tenant-a` | `qa-tenant-b` |
| Filas de la otra empresa | 0 | 0 |
| Leer esquema anterior `axiomos_autopilot_qa` | 42501 | 42501 |

Con el LOGIN de A: `SET ROLE axiomos_mtqa_b_reader` devolvió SQLSTATE 42501; INSERT devolvió SQLSTATE 42501. La consulta con `SET LOCAL ROLE` desde el propietario **no sirve** para comprobar la separación de privilegios, porque el usuario propietario tiene ambos roles: por eso se repitió la prueba con credenciales separadas.

## Límites antes de venderlo como multiempresa

La identidad QA actual busca una membresía fija `axiomai`, el panel usa `axiomai-qa` y el esquema de eventos existente impone `tenant_id='axiomai-qa'`. Esta prueba nueva no los conecta ni los cambia. Falta crear y verificar aprovisionamiento por empresa, selección de empresa desde una membresía activa del servidor, credenciales independientes para los servicios de datos, revocación y pruebas de todas las rutas de escritura y lectura. Para escalar a muchos clientes, se deberá revisar el costo de roles por empresa y un diseño alternativo de contexto transaccional con RLS; nunca confiar en un `tenant_id` enviado por el navegador ni en un GUC libremente modificable por un cliente SQL.

El panel sigue mostrando únicamente datos sintéticos. No se consultaron prospectos reales ni se enviaron mensajes.
