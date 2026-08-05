export default function Logo() {
return (
<div
style={{
display: "flex",
flexDirection: "column",
alignItems: "center",
gap: "12px",
}}
>
<div
style={{
width: "90px",
height: "90px",
borderRadius: "22px",
background:
"linear-gradient(145deg, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)",
display: "flex",
alignItems: "center",
justifyContent: "center",
boxShadow:
"0 0 35px rgba(59,130,246,.45), 0 12px 35px rgba(0,0,0,.45)",
}}
>
<span
style={{
color: "white",
fontSize: "42px",
fontWeight: "bold",
}}
>
A
</span>
</div>

<div style={{ textAlign: "center" }}>
<h2
style={{
margin: 0,
color: "white",
fontSize: "34px",
letterSpacing: "2px",
}}
>
AxiomAI <span style={{ color: "#60a5fa" }}>Solutions</span>
</h2>

<p
style={{
marginTop: "8px",
color: "#94a3b8",
fontSize: "16px",
}}
>
El cerebro operativo del futuro
</p>
</div>
</div>
);
}