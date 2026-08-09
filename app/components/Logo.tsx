import Image from "next/image";

export default function Logo() {
return (
<div
style={{
display: "flex",
justifyContent: "center",
alignItems: "center",
width: "100%",
marginBottom: "20px",
}}
>
<Image
src="/logo.png"
alt="AxiomAI Solutions"
width={520}
height={360}
priority
style={{
width: "420px",
maxWidth: "85vw",
height: "auto",
objectFit: "contain",
filter: "drop-shadow(0 0 35px rgba(56, 189, 248, 0.55))",
borderRadius: "24px",
}}
/>
</div>
);
}