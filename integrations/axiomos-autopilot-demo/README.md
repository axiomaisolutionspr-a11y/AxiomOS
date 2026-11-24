# Axira Asiste — integración preparada para AxiomOS Autopilot DEMO

Fecha: 2026-11-23
Destino exacto: proyecto Vercel independiente axiomos-autopilot-demo (prj_nPB3WmyL0yKAFniTlU5UneJAZrJ5).
Estado: código portable de integración SOLO QA, todavía NO incorporado al despliegue activo.

## Auditoría de origen

Se identificó el despliegue Vercel dpl_jNPp9BGuHbpv3FTnb6eoGLAQSpQQ con alias axiomos-autopilot-demo.vercel.app. La metadata consultada informa framework=null y no muestra metadatos Git. El árbol de archivos del despliegue contiene src/index.html, src/logo.webp y src/c0.bin–src/c3.bin. Esto confirma el contenido publicado observado, pero no demuestra cómo se compiló ni que la aplicación sea estática. El código editable completo no se identificó en el repositorio AxiomOS ni en los repositorios GitHub accesibles; por ello, falta localizar la fuente original. No se recuperó el contenido completo de los archivos binarios para reconstruirla.

No es seguro sustituir un sitio compilado sin su fuente completa y sin comprobar la compilación resultante. No sobrescribir ni reconstruir archivos productivos a partir de fragmentos.

Este paquete NO está conectado con app/demo-comercial del DEMO comercial v3, que es otro proyecto.

## Contenido de esta entrega

- axira-asiste-policy.mjs: valida conversaciones y conocimiento ficticios y produce tres simulaciones deterministas; no llama a ningún modelo.
- axira-asiste-widget.mjs: panel para montar dentro de una ficha de conversación existente, con botones para analizar, editar y copiar.
- axira-asiste-widget.css: estilos específicos, sin alterar el CRM global.
- Pruebas aisladas en tests/axiomos-autopilot-demo-axira-asiste.test.mjs.

IMPORTANTE: la versión actual del paquete es un simulador QA. No afirmar que la IA ya lee mensajes de producción ni que está instalado en el DEMO publicado.

## Contrato de integración prevista

Cuando esté disponible el código fuente editable del DEMO y se trabaje en copia aislada, importar este componente y montarlo en el contenedor REAL de la conversación del prospecto.

Ejemplo de uso:

    import { mountAxiraAsisteDemo } from "./axira-asiste-widget.mjs";

    const handle = mountAxiraAsisteDemo({
      container: document.querySelector("#detalle-del-prospecto"),
      initial: {
        sector: "dealer",
        businessFacts: "Dealer ficticio: precios y disponibilidad requieren verificación.",
        messages: [
          { by: "cliente", text: "¿Cuál vehículo me recomiendan?" },
          { by: "negocio", text: "¿Qué tipo de vehículo prefieres?" },
          { by: "cliente", text: "Una SUV para mi familia." }
        ]
      }
    });

El selector anterior es solo un ejemplo, NO una suposición sobre el código original del DEMO. Incluir el CSS con enlace o importación en la copia QA.

La aplicación que lo monte debe conservar intactas las rutas, la autenticación y las conexiones ya existentes. Para deshacer el panel en QA: handle.unmount() elimina la interfaz sin tocar datos.

## Funcionalidad posterior (sin habilitarla)

Para sugerencias generadas con IA es indispensable añadir un endpoint del lado servidor que:

1. Reutilice la autenticación QA autorizada sin alterar credenciales actuales.
2. Aísle los datos por empresa y rechace información real durante pruebas.
3. Implemente un límite diario atómico, control de gastos y trazabilidad.
4. Utilice una clave/modelo autorizados de QA, nunca claves visibles en navegador.
5. Devuelva tres respuestas en formato estructurado, sin envío, escritura ni seguimientos.
6. Respete consentimiento y políticas por canal.
7. Requiera revisión adicional antes de leer conversaciones reales.

El módulo actual permite un generador inyectado por la aplicación anfitriona. NO hay conexión de IA activa en el standalone.

## Restricciones permanentes

- No tocar producción del CRM, Autopilot ni el DEMO en Vercel.
- No cambiar llaves, PIN, tokens, webhooks, Dualhook, WhatsApp, Instagram, Messenger, Telnyx o números.
- No escribir en bases de datos ni cambiar límites o configuración de Vercel.
- No enviar mensajes, generar llamadas, cobrar, guardar prospectos o agendar citas.
- No alterar la rama main, DEMO comercial v3 ni PR #123 del CRM original.
- No certificar producción con pruebas sintéticas.
- Conservar el despliegue Vercel original sin modificaciones.

## Certificación

Ejecutar:

    node --test tests/axiomos-autopilot-demo-axira-asiste.test.mjs

Después, con el código fuente original, probar la aplicación completa en QA: acceso, pestañas, conversaciones, CRM, Autopilot, móviles, aislamiento y ausencia de envíos. La integración real y la IA permanecen bloqueadas hasta superar esas pruebas.
