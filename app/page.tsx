import Logo from "./components/Logo";
import BrainButton from "./components/BrainButton";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(180deg, #081225 0%, #0d1b36 100%)",
        color: "white",
      }}
    >
      <Logo />

      <h1 style={{ marginTop: 30 }}>
        Bienvenido a AxiomOS
      </h1>

      <p>El cerebro operativo del futuro.</p>

      <div style={{ marginTop: 30 }}>
        <BrainButton />
      </div>
    </main>
  );
}
