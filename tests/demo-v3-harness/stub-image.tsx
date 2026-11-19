// Sustituto de next/image solo para el banco de pruebas local.
export default function Image(props: any) { const { unoptimized, priority, ...rest } = props; return <img {...rest} />; }
