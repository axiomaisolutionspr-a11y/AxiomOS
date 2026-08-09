"use client";

import BrainButton from "./components/BrainButton";
import Logo from "./components/Logo";

const servicios = [
  {
    titulo: "Automatización",
    texto: "Automatizamos tareas y procesos repetitivos de tu empresa.",
  },
  {
    titulo: "Inteligencia Artificial",
    texto: "Soluciones de IA adaptadas a las necesidades de tu negocio.",
  },
  {
    titulo: "Software Empresarial",
    texto: "Desarrollamos herramientas digitales hechas para tu empresa.",
  },
];

const automatizaciones = [
  {
    titulo: "Atención al cliente",
    texto:
      "Respuestas automáticas a preguntas frecuentes, solicitudes, horarios, servicios y consultas de clientes.",
  },
  {
    titulo: "WhatsApp y mensajería",
    texto:
      "Sistemas para responder mensajes, recopilar información y dirigir cada cliente al servicio correcto.",
  },
  {
    titulo: "Órdenes y solicitudes",
    texto:
      "Recibe pedidos, solicitudes de servicios y datos de clientes desde tu página web de forma organizada.",
  },
  {
    titulo: "Seguimiento de clientes",
    texto:
      "Automatiza recordatorios, seguimiento de prospectos y comunicaciones posteriores a una venta o servicio.",
  },
  {
    titulo: "Tareas administrativas",
    texto:
      "Reduce trabajo manual en procesos internos, organización de información y tareas repetitivas.",
  },
  {
    titulo: "Soluciones personalizadas",
    texto:
      "Si tu negocio tiene un proceso particular, podemos diseñar una solución tecnológica específicamente para él.",
  },
];

const pasos = [
  {
    numero: "01",
    titulo: "Evaluamos tu negocio",
    texto:
      "Identificamos las tareas que consumen tiempo y los procesos que pueden mejorarse.",
  },
  {
    numero: "02",
    titulo: "Diseñamos la solución",
    texto:
      "Creamos una estrategia de automatización, inteligencia artificial o software adaptada a tu empresa.",
  },
  {
    numero: "03",
    titulo: "Implementamos",
    texto:
      "Configuramos y ponemos en funcionamiento la solución para integrarla con tu operación.",
  },
  {
    numero: "04",
    titulo: "Mejoramos y damos soporte",
    texto:
      "Revisamos el funcionamiento y hacemos ajustes para mantener la solución eficiente.",
  },
];

const inputStyle = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: "12px",
  border: "1px solid #285680",
  background: "rgba(4, 12, 24, 0.9)",
  color: "white",
  fontSize: "16px",
  outline: "none",
  boxSizing: "border-box" as const,
};

export default function Home() {
  return (
    <main
      id="inicio"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #102040 0%, #050914 45%, #000000 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        overflowX: "hidden",
      }}
    >
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          width: "100%",
          background: "rgba(2, 7, 15, 0.88)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(83,183,255,0.16)",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <a
            href="#inicio"
            style={{
              color: "white",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: "18px",
            }}
          >
            AxiomAI Solutions
          </a>

          <div
            style={{
              display: "flex",
              gap: "18px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              ["Inicio", "#inicio"],
              ["Servicios", "#servicios"],
              ["Automatización", "#automatizacion"],
              ["Cómo trabajamos", "#proceso"],
              ["Evaluación", "#evaluacion"],
              ["Contacto", "#contacto"],
            ].map(([texto, enlace]) => (
              <a
                key={texto}
                href={enlace}
                style={{
                  color: "#b9c6d8",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {texto}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "55px 20px 80px",
        }}
      >
        <Logo />

        <p
          style={{
            marginTop: "24px",
            marginBottom: "8px",
            fontSize: "18px",
            letterSpacing: "4px",
            color: "#53b7ff",
          }}
        >
          AXIOM AI
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(42px, 8vw, 82px)",
            fontWeight: 800,
            letterSpacing: "-2px",
          }}
        >
          AxiomOS
        </h1>

        <h2
          style={{
            marginTop: "16px",
            marginBottom: "12px",
            fontSize: "clamp(22px, 4vw, 38px)",
            fontWeight: 500,
          }}
        >
          Soluciones Inteligentes para Empresas
        </h2>

        <p
          style={{
            maxWidth: "720px",
            margin: "0 auto 30px",
            color: "#b9c6d8",
            fontSize: "18px",
            lineHeight: 1.7,
          }}
        >
          Automatización, inteligencia artificial y desarrollo de software
          diseñados para transformar la manera en que opera tu negocio.
        </p>

        <BrainButton />

        <p
          style={{
            marginTop: "24px",
            color: "#7f91aa",
            fontSize: "15px",
          }}
        >
          Evaluación inicial gratuita • Servicio 24/7
        </p>

        <div
          id="servicios"
          style={{
            width: "100%",
            maxWidth: "1100px",
            marginTop: "90px",
            scrollMarginTop: "100px",
          }}
        >
          <h2 style={{ fontSize: "34px", marginBottom: "12px" }}>
            Soluciones para hacer crecer tu negocio
          </h2>

          <p
            style={{
              color: "#9fb0c7",
              fontSize: "17px",
              marginBottom: "35px",
            }}
          >
            Tecnología inteligente diseñada para ahorrar tiempo, reducir costos
            y mejorar la atención a tus clientes.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "20px",
            }}
          >
            {servicios.map((item) => (
              <div
                key={item.titulo}
                style={{
                  padding: "28px",
                  border: "1px solid #173b66",
                  borderRadius: "18px",
                  background: "rgba(10, 25, 48, 0.65)",
                }}
              >
                <h3>{item.titulo}</h3>
                <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                  {item.texto}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          id="automatizacion"
          style={{
            width: "100%",
            maxWidth: "1100px",
            marginTop: "100px",
            scrollMarginTop: "100px",
          }}
        >
          <p
            style={{
              color: "#53b7ff",
              fontWeight: 700,
              letterSpacing: "3px",
              fontSize: "14px",
            }}
          >
            AXIOM AUTOMATION
          </p>

          <h2
            style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              marginBottom: "14px",
            }}
          >
            ¿Qué podemos automatizar?
          </h2>

          <p
            style={{
              maxWidth: "760px",
              margin: "0 auto 40px",
              color: "#9fb0c7",
              fontSize: "17px",
              lineHeight: 1.7,
            }}
          >
            Analizamos cómo funciona tu empresa y creamos soluciones que
            trabajan automáticamente para que puedas concentrarte en hacer
            crecer el negocio.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {automatizaciones.map((item) => (
              <div
                key={item.titulo}
                style={{
                  padding: "24px",
                  border: "1px solid rgba(83,183,255,0.22)",
                  borderRadius: "16px",
                  background: "rgba(5,14,28,0.78)",
                  textAlign: "left",
                }}
              >
                <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                  {item.titulo}
                </h3>
                <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                  {item.texto}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          id="proceso"
          style={{
            width: "100%",
            maxWidth: "1100px",
            marginTop: "100px",
            scrollMarginTop: "100px",
          }}
        >
          <p
            style={{
              color: "#53b7ff",
              fontWeight: 700,
              letterSpacing: "3px",
              fontSize: "14px",
            }}
          >
            NUESTRO PROCESO
          </p>

          <h2
            style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              marginBottom: "14px",
            }}
          >
            Cómo trabajamos
          </h2>

          <p
            style={{
              maxWidth: "760px",
              margin: "0 auto 40px",
              color: "#9fb0c7",
              fontSize: "17px",
              lineHeight: 1.7,
            }}
          >
            Un proceso claro desde la primera evaluación hasta la
            implementación de la solución.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "18px",
            }}
          >
            {pasos.map((paso) => (
              <div
                key={paso.numero}
                style={{
                  textAlign: "left",
                  padding: "28px",
                  borderRadius: "18px",
                  border: "1px solid rgba(83,183,255,0.2)",
                  background:
                    "linear-gradient(145deg, rgba(12,31,58,0.72), rgba(4,11,22,0.88))",
                }}
              >
                <div
                  style={{
                    color: "#53b7ff",
                    fontSize: "30px",
                    fontWeight: 800,
                    marginBottom: "12px",
                  }}
                >
                  {paso.numero}
                </div>

                <h3 style={{ marginTop: 0 }}>{paso.titulo}</h3>

                <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                  {paso.texto}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: "90px",
            width: "100%",
            maxWidth: "900px",
            padding: "45px 25px",
            borderRadius: "22px",
            border: "1px solid rgba(83,183,255,0.3)",
            background:
              "linear-gradient(135deg, rgba(16,42,78,0.8), rgba(4,11,22,0.9))",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "32px" }}>
            Tu negocio puede trabajar de forma más inteligente
          </h2>

          <p
            style={{
              color: "#b9c6d8",
              fontSize: "17px",
              lineHeight: 1.7,
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            Cuéntanos qué tareas consumen más tiempo en tu empresa. Podemos
            ayudarte a identificar qué procesos se pueden automatizar y qué
            solución tecnológica tiene más sentido para tu negocio.
          </p>
        </div>

        <div
          id="evaluacion"
          style={{
            width: "100%",
            maxWidth: "760px",
            marginTop: "100px",
            scrollMarginTop: "100px",
          }}
        >
          <p
            style={{
              color: "#53b7ff",
              fontWeight: 700,
              letterSpacing: "3px",
              fontSize: "14px",
            }}
          >
            COMIENZA AQUÍ
          </p>

          <h2
            style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              marginBottom: "12px",
            }}
          >
            Solicita tu evaluación gratuita
          </h2>

          <p
            style={{
              color: "#9fb0c7",
              fontSize: "17px",
              lineHeight: 1.7,
              marginBottom: "35px",
            }}
          >
            Cuéntanos brevemente sobre tu negocio y qué necesitas mejorar.
          </p>

          <form
            action="https://formsubmit.co/axiomia@outlook.com"
            method="POST"
            style={{
              display: "grid",
              gap: "18px",
              padding: "32px",
              borderRadius: "22px",
              border: "1px solid rgba(83,183,255,0.3)",
              background: "rgba(5,15,30,0.88)",
              textAlign: "left",
            }}
          >
            <input
              type="hidden"
              name="_subject"
              value="Nueva solicitud - AxiomAI Solutions"
            />

            <input type="hidden" name="_template" value="table" />

<input
  type="hidden"
  name="_next"
  value="https://www.axiomaisolutions.org/gracias"
/>

            <input type="hidden" name="_captcha" value="false" />

            <input
              type="text"
              name="_honey"
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div>
              <label>Nombre</label>
              <input
                required
                name="nombre"
                type="text"
                placeholder="Tu nombre"
                style={{ ...inputStyle, marginTop: "8px" }}
              />
            </div>

            <div>
              <label>Nombre del negocio</label>
              <input
                name="negocio"
                type="text"
                placeholder="Nombre de tu empresa o negocio"
                style={{ ...inputStyle, marginTop: "8px" }}
              />
            </div>

            <div>
              <label>Teléfono / WhatsApp</label>
              <input
                required
                name="telefono"
                type="tel"
                placeholder="Tu número de contacto"
                style={{ ...inputStyle, marginTop: "8px" }}
              />
            </div>

            <div>
              <label>Correo electrónico</label>
              <input
                required
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                style={{ ...inputStyle, marginTop: "8px" }}
              />
            </div>

            <div>
              <label>¿Qué necesitas automatizar o mejorar?</label>
              <textarea
                required
                name="mensaje"
                rows={6}
                placeholder="Explícanos brevemente qué necesitas..."
                style={{
                  ...inputStyle,
                  marginTop: "8px",
                  resize: "vertical",
                  fontFamily: "Arial, sans-serif",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: "8px",
                padding: "16px 24px",
                border: "none",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #1d7fff 0%, #42dfff 100%)",
                color: "white",
                fontSize: "17px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 0 25px rgba(45,151,255,0.35)",
              }}
            >
              Solicitar evaluación gratuita
            </button>

            <p
              style={{
                textAlign: "center",
                color: "#71839c",
                fontSize: "13px",
                margin: 0,
              }}
            >
              Sin compromiso • Evaluación inicial gratuita
            </p>
          </form>
        </div>

        <div
          id="contacto"
          style={{
            width: "100%",
            maxWidth: "900px",
            marginTop: "100px",
            padding: "42px 26px",
            borderRadius: "22px",
            scrollMarginTop: "100px",
            border: "1px solid rgba(83,183,255,0.25)",
            background: "rgba(5,14,28,0.72)",
          }}
        >
          <p
            style={{
              color: "#53b7ff",
              fontWeight: 700,
              letterSpacing: "3px",
              fontSize: "14px",
            }}
          >
            CONTACTO
          </p>

          <h2 style={{ fontSize: "34px", marginBottom: "12px" }}>
            Hablemos de tu proyecto
          </h2>

          <p
            style={{
              color: "#b9c6d8",
              lineHeight: 1.7,
              fontSize: "17px",
              maxWidth: "650px",
              margin: "0 auto 28px",
            }}
          >
            Puedes comunicarte con AxiomAI Solutions para discutir una idea,
            una automatización o una solución personalizada para tu empresa.
          </p>

          <a
            href="mailto:axiomia@outlook.com"
            style={{
              display: "inline-block",
              padding: "15px 28px",
              borderRadius: "12px",
              textDecoration: "none",
              background:
                "linear-gradient(135deg, #1d7fff 0%, #42dfff 100%)",
              color: "white",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            axiomia@outlook.com
          </a>

          <p
            style={{
              marginTop: "22px",
              marginBottom: 0,
              color: "#71839c",
              fontSize: "14px",
            }}
          >
            Disponibilidad 24/7 • Evaluación inicial gratuita
          </p>
        </div>

        <footer
          style={{
            marginTop: "80px",
            paddingTop: "30px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            width: "100%",
            maxWidth: "1100px",
            color: "#71839c",
            fontSize: "14px",
          }}
        >
          © 2026 AxiomAI Solutions
        </footer>
      </section>
    </main>
  );
}
