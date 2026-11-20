"""Genera PDFs de prueba deterministicos para tests y smoke:
1. guia_tallas.pdf: texto multipagina con secciones claras (chunks de 500-1000 tokens).
2. ficha_escaneada.pdf: paginas solo imagen (sin capa de texto) para probar OCR Tesseract.
"""

from pathlib import Path

import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).resolve().parent


def _build_guia_tallas(out_path: Path) -> None:
    doc = fitz.open()
    sections = [
        (
            "1. Nike — Horma y Materiales",
            [
                (
                    "Nike Air Force 1 Low '07 (Blanco): Este modelo clasico cuenta con capellada en "
                    "cuero plena flor de alta resistencia, perforaciones frontales para ventilacion "
                    "constante y entresuela de espuma con unidad Air encapsulada que amortigua cada "
                    "paso urbano. Su horma es fiel a la talla habitual (TRUE_TO_SIZE) en el rango "
                    "colombiano EU 36 a EU 44. Para pies de empeine alto o ancho medio se recomienda "
                    "mantener la talla regular y ajustar los cordones planos desde el segundo ojal. "
                    "El peso aproximado del par es de 480 gramos y su suela de caucho con patron "
                    "pivote brinda traccion duradera en asfalto y baldosa."
                ),
                (
                    "Nike Dunk Low Retro (Panda / Blanco y Negro) y Nike Air Jordan 1 Retro High OG: "
                    "El Dunk Low Retro ofrece silueta de perfil bajo con paneles bicolor en cuero "
                    "tratado y cuello acolchado suave. El Air Jordan 1 Retro High OG incorpora cana "
                    "alta estructurada con soporte en el tobillo, unidad Air-Sole en el talon y suela "
                    "con patron radial de baloncesto. En ambos casos la guia oficial de Key Street "
                    "indica horma normal; si prefieres media pulgada de holgura con medias gruesas "
                    "de streetwear puedes optar por la talla inmediatamente superior en el Air Jordan 1."
                ),
            ],
        ),
        (
            "2. Adidas — Horma y Siluetas Retro",
            [
                (
                    "Adidas Samba OG (Blanco / Negro): Tenis retro con suela de goma natural color "
                    "caramelo, puntera T-toe en gamuza suave y cuerpo en cuero flexible. IMPORTANTE: "
                    "El Samba OG tiene horma estrecha (RUNS_SMALL) especialmente en el antepie; "
                    "si tienes pie ancho o estas entre dos tallas, Key Street recomienda elegir una "
                    "talla arriba para evitar presion lateral en los dedos durante caminatas largas."
                ),
                (
                    "Adidas Campus 00s y Adidas Forum Low: El Campus 00s retoma el estilo skate de "
                    "los anos 2000 con gamuza gruesa, lengueta extra acolchada y cordones anchos "
                    "que dan un calce envolvente pero fiel a la talla. El Adidas Forum Low combina "
                    "cuero sintetico premium con correa de velcro removible en el tobillo y suela "
                    "de espiga estable para uso diario en ciudad."
                ),
            ],
        ),
        (
            "3. Puma, New Balance y Converse — Cuidado y Tallas",
            [
                (
                    "Puma Suede XL, New Balance 550 y New Balance 574: La gamuza de Puma Suede XL y "
                    "NB 574 debe limpiarse en seco con cepillo de cerdas suaves y nunca sumergirse "
                    "en agua ni meterse a lavadora. La entresuela ENCAP del New Balance 574 mezcla "
                    "espuma EVA ligera con borde de poliuretano para maxima comodidad y soporte del "
                    "arco plantar durante jornadas completas de pie."
                ),
                (
                    "Converse Chuck Taylor All Star (Bota / Clasico): Modelo atemporal confeccionado "
                    "en lona de algodon resistente con plantilla OrthoLite y suela de caucho "
                    "vulcanizado. Su horma tiende a quedar ligeramente amplia (RUNS_LARGE); en pies "
                    "delgados se sugiere elegir la talla exacta o media talla menos segun preferencia "
                    "de ajuste en la puntera de goma."
                ),
            ],
        ),
    ]

    for idx, (heading, paragraphs) in enumerate(sections, start=1):
        page = doc.new_page(width=595, height=842)
        y = 70
        page.insert_text((50, y), heading, fontsize=18, fontname="helv")
        y += 38
        # Repetir bloques tecnicos ampliados para que cada seccion supere ~550 tokens reales
        expanded = paragraphs * 4
        for p_idx, para in enumerate(expanded, start=1):
            rect = fitz.Rect(50, y, 545, y + 150)
            res = page.insert_textbox(rect, f"[Nota {idx}.{p_idx}] {para}", fontsize=10.5, fontname="helv")
            if res < 0:
                page = doc.new_page(width=595, height=842)
                y = 60
                rect = fitz.Rect(50, y, 545, y + 150)
                page.insert_textbox(rect, f"[Nota {idx}.{p_idx}] {para}", fontsize=10.5, fontname="helv")
            y += 125
            if y > 700:
                page = doc.new_page(width=595, height=842)
                y = 60

    doc.save(out_path)
    doc.close()


def _build_ficha_escaneada(out_path: Path) -> None:
    doc = fitz.open()
    lines_per_page = [
        [
            "FICHA ESCANEADA KEY STREET - GARANTIA Y ENVIOS",
            "Todos los pares incluyen verificacion de autenticidad y caja original.",
            "Despachos express en Bogota y Medellin entre 24 y 48 horas habiles.",
            "Cambios por talla disponibles dentro de los 30 dias calendario siguientes.",
            "Conserve la suela limpia y las etiquetas intactas para tramitar cambio.",
        ],
        [
            "PROTOCOLO DE CUIDADO PARA GAMUZA Y LONA",
            "Evitar exposicion directa al sol despues de limpiar con pano humedo.",
            "Aplicar protector hidrofugo en gamuza antes del primer uso urbano.",
        ],
    ]
    font = ImageFont.load_default(size=24) if hasattr(ImageFont, "load_default") else None

    for lines in lines_per_page:
        img = Image.new("RGB", (1400, 1800), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        y = 120
        for line in lines:
            if font is not None:
                draw.text((80, y), line, fill=(15, 23, 42), font=font)
            else:
                draw.text((80, y), line, fill=(15, 23, 42))
            y += 95
        import io

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        page = doc.new_page(width=595, height=842)
        page.insert_image(page.rect, stream=buf.getvalue())

    doc.save(out_path)
    doc.close()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    _build_guia_tallas(OUT_DIR / "guia_tallas.pdf")
    _build_ficha_escaneada(OUT_DIR / "ficha_escaneada.pdf")
    print(f"Fixtures generados en {OUT_DIR}")


if __name__ == "__main__":
    main()
