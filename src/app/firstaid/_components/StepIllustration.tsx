import React from 'react';
import Image from 'next/image';

type IllustrationType = "omoplatos" | "esternon" | "heimlich" | "rcp_hands" | "posicion_lateral" | "epipen" | "torniquete";

interface Props {
    type?: IllustrationType;
}

export default function StepIllustration({ type }: Props) {
    if (!type) return null;

    const getImgSrc = () => {
        switch (type) {
            case "omoplatos": return "/images/firstaid/omoplatos.png";
            case "esternon":  return "/images/firstaid/esternon.png";
            case "heimlich":  return "/images/firstaid/heimlich.png";
            case "rcp_hands": return "/images/firstaid/rcp_hands.png";
            case "posicion_lateral": return "/images/firstaid/posicion_lateral.png";
            case "epipen":    return "/images/firstaid/epipen.png";
            case "torniquete": return "/images/firstaid/torniquete.png";
            default: return "";
        }
    };

    const getDesc = () => {
        switch (type) {
            case "omoplatos": return "Los omóplatos (paletas) son los huesos triangulares en la parte superior de la espalda. Golpea justo en el centro de ambos.";
            case "esternon":  return "El esternón es el hueso plano en el centro del pecho. Aplica presión justo en la mitad, entre los pezones.";
            case "heimlich":  return "Coloca el puño ligeramente por encima del ombligo. Presiona con fuerza hacia adentro y hacia arriba en un movimiento rápido.";
            case "rcp_hands": return "Usa solo el talón de una mano contra el pecho. Entrelaza los dedos de la otra mano por encima para hacer más fuerza.";
            case "posicion_lateral": return "Acuesta a la persona de lado, con la pierna superior flexionada para dar estabilidad y la mano bajo la mejilla para mantener las vías respiratorias abiertas.";
            case "epipen":    return "Sujeta el autoinyector firmemente y presiona la punta contra la parte externa del muslo hasta escuchar un clic.";
            case "torniquete": return "Coloca la banda firmemente por encima de la herida sangrante y ajusta hasta que el sangrado abundante se detenga.";
            default: return "";
        }
    };

    const src = getImgSrc();
    if (!src) return null;

    return (
        <div style={{
            marginTop: 12,
            background: "#FAFAFA",
            border: "1px solid #E8E2D8",
            borderRadius: 12,
            padding: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
        }}>
            <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: "hidden", position: "relative", border: "1px solid #E8E2D8" }}>
                <Image 
                    src={src} 
                    alt="Guía Visual" 
                    fill 
                    style={{ objectFit: "cover" }} 
                    sizes="72px"
                />
            </div>
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1A1512" }}>
                    Guía Visual Pro
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8C7F6E", lineHeight: 1.45, fontWeight: 500 }}>
                    {getDesc()}
                </p>
            </div>
        </div>
    );
}
