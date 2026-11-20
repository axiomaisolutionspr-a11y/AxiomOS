// El robot BrainBot y los botones flotantes del sitio público tapan formularios del CRM en el teléfono.
// Solo se ocultan en las páginas que montan este componente.
export default function HideSiteWidgets() {
  return <style>{".axiom-robotics-portal{display:none!important}"}</style>;
}
