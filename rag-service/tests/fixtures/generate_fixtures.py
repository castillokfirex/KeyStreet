"""Genera los PDFs oficiales de conocimiento y prueba de Key Street:
1. guia_tallas.pdf: manual completo de los 14 modelos activos (Nike, Jordan, Adidas,
   New Balance, Puma, Vans y Converse), tabla de tallas EU 36-44 y guia de regalos.
2. ficha_escaneada.pdf: 2 paginas solo imagen (sin capa de texto) para probar OCR Tesseract
   con politicas de garantia, envios, cambios y cuidado de materiales.
"""

import io
from pathlib import Path

import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).resolve().parent


def _write_section_pages(doc: fitz.Document, heading: str, paragraphs: list[str]) -> None:
    page = doc.new_page(width=595, height=842)
    y = 60
    page.insert_text((50, y), heading, fontsize=16, fontname="hebo")
    y += 32

    for para in paragraphs:
        # Estimar alto necesario (~15 pt por linea a ~88 caracteres por linea)
        est_lines = max(3, (len(para) // 82) + 2)
        box_h = est_lines * 15 + 14
        if y + box_h > 785:
            page = doc.new_page(width=595, height=842)
            y = 55
        rect = fitz.Rect(50, y, 545, y + box_h)
        res = page.insert_textbox(rect, para, fontsize=10.5, fontname="helv", lineheight=1.35)
        if res < 0:
            page = doc.new_page(width=595, height=842)
            y = 55
            rect = fitz.Rect(50, y, 545, y + box_h + 40)
            page.insert_textbox(rect, para, fontsize=10.5, fontname="helv", lineheight=1.35)
            y += box_h + 48
        else:
            y += box_h + 6


def _build_guia_tallas(out_path: Path) -> None:
    doc = fitz.open()
    sections = [
        (
            "1. Nike y Jordan — Horma, Materiales y Fichas Técnicas",
            [
                (
                    "Nike Air Force 1 '07 (Blanco) | Ref: CW2288-111 | Silueta: LOW | Peso: 480 g. "
                    "Precio regular: $584.950 COP, actualmente con 10% de descuento automatico ($526.400 COP). "
                    "Capellada en cuero plena flor blanco total con perforaciones en la puntera para "
                    "ventilacion constante, forro textil transpirable, entresuela de espuma con unidad "
                    "Air encapsulada y suela de caucho con patron pivote. Horma fiel a la talla habitual "
                    "(TRUE_TO_SIZE) en tallas EU 36 a EU 44. Para empeine alto se recomienda mantener la "
                    "talla regular y aflojar ligeramente los cordones planos desde el segundo ojal. "
                    "Cuidado: limpiar con pano humedo y jabon neutro; no usar lavadora."
                ),
                (
                    "Nike Dunk Low Retro (Panda / Blanco y Negro) | Silueta: LOW | Peso: 450 g | $679.950 COP. "
                    "Capellada de cuero con paneles bicolor blanco y negro de alto contraste, cuello "
                    "acolchado de perfil bajo, mediasuela de espuma de poliuretano y suela de caucho con "
                    "patron pivote. Horma fiel a la talla (TRUE_TO_SIZE) en EU 36 a EU 44. Silueta de "
                    "baloncesto de los 80 facil de combinar en looks urbanos y skate diarios. "
                    "Cuidado: limpiar con pano humedo; evitar cepillos abrasivos en el cuero."
                ),
                (
                    "Air Jordan 1 Low (Blanco / Azul marino) | Silueta: LOW | Peso: 430 g | $699.950 COP. "
                    "Cuero con paneles en contraste blanco y azul marino, logo Wings bordado en el talon, "
                    "forro textil acolchado, unidad Air encapsulada en el talon y suela de caucho con "
                    "circulo de pivote. Horma fiel a la talla (TRUE_TO_SIZE) en EU 36 a EU 44. "
                    "Ofrece presencia clasica de cancha de 1985 en un perfil bajo muy facil de llevar "
                    "con jeans rectos, chinos o pantalon cargo. Cuidado: pano humedo y protector de cuero."
                ),
                (
                    "Air Jordan 4 Retro (White Cement) | Silueta: MID | Peso: 600 g | $1.219.950 COP. "
                    "Modelo iconico de 1989 en blanco y gris cemento. Capellada de cuero con paneles de "
                    "malla transpirable, alas laterales de soporte para cordones, poliuretano con unidad "
                    "Air visible en el talon y suela de caucho de alta traccion. Horma fiel a la talla "
                    "(TRUE_TO_SIZE). Ideal para coleccionistas y amantes del streetwear premium. "
                    "Cuidado: limpiar con pano humedo y jabon neutro; no usar lavadora."
                ),
            ],
        ),
        (
            "2. Adidas — Horma, Siluetas Retro y Clásicos",
            [
                (
                    "Adidas Samba OG (Blanco / Negro / Goma) | Ref: B75806 | Silueta: LOW | "
                    "Peso: 380 g | $499.950 COP. "
                    "Cuero liso blanco con las tres franjas negras, puntera en T (T-toe) de gamuza suave "
                    "y suela de goma natural color caramelo. IMPORTANTE sobre talla: el Adidas Samba OG "
                    "tiene horma estrecha (RUNS_SMALL) especialmente en el antepie y empeine. Si tienes "
                    "pie ancho o estas entre dos tallas, Key Street recomienda elegir una talla arriba "
                    "para evitar presion lateral. Cuidado: cepillo para gamuza en seco; evitar agua."
                ),
                (
                    "Adidas Superstar (Blanco / Negro) | Ref: KK4685 | Silueta: LOW | Peso: 470 g | $549.950 COP. "
                    "Clasico urbano con capellada de cuero liso, puntera de goma tipo concha, tres franjas "
                    "en contraste, mediasuela de caucho moldeado y suela con patron de espiga. Horma fiel "
                    "a la talla (TRUE_TO_SIZE), comoda y amplia en la puntera para jornadas largas. "
                    "Cuidado: limpiar con pano humedo; la puntera de goma se limpia facil con jabon suave."
                ),
                (
                    "Adidas Stan Smith (Blanco / Verde) | Ref: M20324 | Silueta: LOW | Peso: 420 g | $549.950 COP. "
                    "Minimalista por excelencia: capellada lisa blanca con tres hileras de perforaciones "
                    "laterales en lugar de franjas, refuerzo de talon verde clasico, plantilla acolchada "
                    "y suela de caucho de perfil delgado. Horma fiel a la talla (TRUE_TO_SIZE). "
                    "Es uno de los tenis mas elegantes, sobrios y faciles de vestir con ropa casual o smart casual."
                ),
                (
                    "Adidas Campus 00s (Café / Blanco) | Ref: HQ8708 | Silueta: LOW | Peso: 520 g | $499.950 COP. "
                    "Estetica skate de los anos 2000 (Y2K) en gamuza suave color cafe con franjas anchas "
                    "blancas, lengueta acolchada gruesa, cordones anchos y suela EVA de perfil grueso en "
                    "tono crudo con patron de ondas. Horma fiel a la talla (TRUE_TO_SIZE) con calce "
                    "envolvente. Cuidado: cepillar la gamuza en seco y evitar la humedad directa."
                ),
                (
                    "Adidas Handball Spezial (Negro / Blanco / Goma) | Ref: KZ6705 | Silueta: LOW | "
                    "Peso: 360 g | $549.950 COP. "
                    "Nacido en las canchas de balonmano de los 70. Capellada de gamuza negra aterciopelada, "
                    "franjas blancas en contraste, mediasuela EVA ligera y suela de goma natural color "
                    "caramelo. Horma fiel a la talla (TRUE_TO_SIZE) pero de perfil bajo estilizado y ajustado. "
                    "Cuidado: cepillo para gamuza en seco y protector hidrofugo antes del primer uso."
                ),
            ],
        ),
        (
            "3. New Balance, Puma, Vans y Converse — Confort, Skate y Cuidado",
            [
                (
                    "New Balance 550 (Blanco / Burdeos) | Ref: M55096T | Silueta: LOW | Peso: 490 g | $649.900 COP. "
                    "Baloncesto retro de finales de los 80 rescatado del archivo. Capellada en cuero blanco "
                    "con perforaciones, detalles sobrios en burdeos, cuello acolchado, mediasuela EVA y "
                    "suela de caucho en espiga. Horma fiel a la talla (TRUE_TO_SIZE). Proyecta un porte "
                    "clasico, maduro y muy limpio para uso diario elegante o casual."
                ),
                (
                    "New Balance 530 (Blanco / Plata) | Ref: MR530SG | Silueta: LOW | Peso: 360 g. "
                    "Precio regular: $529.900 COP, con 12% de descuento automatico ($466.300 COP). "
                    "Running retro de los 2000 ultraligero: malla altamente transpirable con refuerzos "
                    "sinteticos plateados, tecnologia de amortiguacion ABZORB en la mediasuela y suela de "
                    "caucho de gran traccion. Horma fiel a la talla (TRUE_TO_SIZE). Es el modelo mas "
                    "liviano y confortable del catalogo para caminar todo el dia o viajar. "
                    "Cuidado: limpiar con pano humedo y jabon neutro; no usar lavadora."
                ),
                (
                    "Puma Suede XL (Negro / Blanco) | Silueta: LOW | Peso: 540 g. "
                    "Precio regular: $449.900 COP, con 12% de descuento automatico ($395.900 COP). "
                    "Version robusta streetwear en gamuza negra con Formstrip blanco, lengueta y cuello "
                    "extra acolchados, cordones anchos y suela EVA moldeada de perfil voluminoso. "
                    "Horma fiel a la talla (TRUE_TO_SIZE). Cuidado: cepillo en seco para gamuza."
                ),
                (
                    "Vans Old Skool (Negro / Blanco) | Ref: VN000D3H | Silueta: LOW | Peso: 420 g | $329.900 COP. "
                    "Icono skate con capellada combinada de lona resistente y refuerzos de gamuza, franja "
                    "lateral Sidestripe blanca, plantilla acolchada y suela vulcanizada con patron waffle. "
                    "Horma fiel a la talla (TRUE_TO_SIZE). Cuidado: cepillar en seco las zonas de gamuza."
                ),
                (
                    "Converse Chuck Taylor All Star (Bota / Clásico Blanco) | Silueta: HIGH | Peso: 620 g. "
                    "Precio regular: $299.900 COP, con 15% de descuento automatico ($254.900 COP). "
                    "Bota atemporal en lona de algodon blanca, puntera de caucho vulcanizado, ojales "
                    "metalicos y plantilla acolchada. IMPORTANTE sobre talla: su horma tiende a quedar "
                    "amplia (RUNS_LARGE); en pies delgados o si dudas entre dos tallas, Key Street "
                    "recomienda elegir una talla menos. Cuidado: lavar a mano con jabon neutro y secar a la sombra."
                ),
            ],
        ),
        (
            "4. Guía de Tallas EU 36–44 y Equivalencias en Colombia",
            [
                (
                    "Tabla de equivalencias oficiales en Key Street (largo del pie en centimetros): "
                    "EU 36 = 22.5 cm | EU 37 = 23.5 cm | EU 38 = 24.0 cm | EU 39 = 24.5 cm | "
                    "EU 40 = 25.5 cm | EU 41 = 26.0 cm | EU 42 = 27.0 cm | EU 43 = 27.5 cm | EU 44 = 28.5 cm. "
                    "Como medir el pie en casa: apoya el talon contra una pared sobre una hoja de papel "
                    "al final del dia (cuando el pie esta ligeramente mas dilatado), marca la punta del "
                    "dedo mas largo, mide la distancia en centimetros y suma 0.5 cm de holgura para calcetin."
                ),
                (
                    "Resumen de calce por silueta: "
                    "1) Horma normal (TRUE_TO_SIZE, pide tu talla EU habitual): Nike Air Force 1 '07, "
                    "Nike Dunk Low Retro, Air Jordan 1 Low, Air Jordan 4 Retro, Adidas Superstar, "
                    "Adidas Stan Smith, Adidas Campus 00s, Adidas Handball Spezial, New Balance 550, "
                    "New Balance 530, Puma Suede XL y Vans Old Skool. "
                    "2) Horma estrecha (RUNS_SMALL, sube 1 talla si tienes pie ancho): Adidas Samba OG. "
                    "3) Horma amplia (RUNS_LARGE, baja 1 talla en pie delgado): Converse Chuck Taylor All Star."
                ),
            ],
        ),
        (
            "5. Guía de Regalos y Estilo Key Street (Jóvenes, Blanco y Día del Padre)",
            [
                (
                    "Regalo ideal para hermana, mujer joven o alguien a quien le gusta el color blanco: "
                    "1) Nike Air Force 1 '07 (Blanco) ($526.400 COP con 10% OFF): es la opcion #1 para "
                    "regalo joven en blanco total; su cuero liso blanco, suela con plataforma discreta y "
                    "diseno limpio combinan con jeans, vestidos, faldas y joggers. "
                    "2) Adidas Stan Smith (Blanco / Verde) ($549.950 COP): blanco minimalista y ligero con "
                    "detalle verde en el talon, ideal si prefiere un estilo pulcro, fresco y menos voluminoso. "
                    "3) Converse Chuck Taylor All Star Bota (Blanco) ($254.900 COP con 15% OFF): silueta "
                    "juvenil atemporal en lona blanca, ligera y muy combinable (recordar horma amplia). "
                    "4) Adidas Samba OG (Blanco / Negro / Goma) ($499.950 COP): el par retro mas pedido "
                    "en tendencia actual, blanco con suela caramelo (recordar horma estrecha). "
                    "5) New Balance 530 (Blanco / Plata) ($466.300 COP con 12% OFF): muy comodo y "
                    "transpirable en blanco y plata, perfecto para caminar o ir a la universidad."
                ),
                (
                    "Regalo ideal para papá o Día del Padre (señor con mucho estilo, elegancia casual y porte): "
                    "1) Adidas Stan Smith (Blanco / Verde) ($549.950 COP): la eleccion mas refinada y "
                    "versatil para un hombre con estilo clasico; luce impecable con jeans oscuros, pantalones "
                    "chinos, camisa o blazer casual. "
                    "2) New Balance 550 (Blanco / Burdeos) ($649.900 COP): cuero blanco con acento burdeos "
                    "sobrio, estructura firme y estetica retro distinguida ideal para hombres que valoran "
                    "calidad y presencia sin verse recargados. "
                    "3) Air Jordan 1 Low (Blanco / Azul marino) ($699.950 COP): combinacion sobria blanco "
                    "y azul marino en cuero con amortiguacion Air en el talon; elegante, comodo y con sello "
                    "de diseno atemporal. "
                    "4) Adidas Handball Spezial (Negro / Goma) ($549.950 COP): gamuza negra elegante con "
                    "suela caramelo de perfil bajo estilizado, perfecto para outfits nocturnos o tonos oscuros. "
                    "5) New Balance 530 (Blanco / Plata) ($466.300 COP con 12% OFF): si prioriza maxima "
                    "comodidad para caminar o viajar con tecnologia ABZORB. "
                    "6) Air Jordan 4 Retro (White Cement) ($1.219.950 COP): regalo de lujo para un papa "
                    "apasionado por los tenis iconicos y el streetwear premium."
                ),
                (
                    "Beneficios al comprar regalo en Key Street Colombia: "
                    "Todos los pedidos superiores a $300.000 COP tienen envio express gratis a toda Colombia "
                    "(aplica para casi todo el catalogo). Si no aciertas con la talla del regalo, ofrecemos "
                    "cambios por talla sin costo adicional dentro de los 30 dias calendario siguientes "
                    "conservando la suela limpia y las etiquetas intactas. Puedes armar tu pedido o pedir "
                    "asesoria personalizada por WhatsApp VIP al +57 317 657 6059."
                ),
            ],
        ),
    ]

    for heading, paragraphs in sections:
        _write_section_pages(doc, heading, paragraphs)

    doc.save(out_path)
    doc.close()


def _build_ficha_escaneada(out_path: Path) -> None:
    doc = fitz.open()
    lines_per_page = [
        [
            "FICHA ESCANEADA KEY STREET - GARANTIA, ENVIOS Y CAMBIOS",
            "Todos los pares incluyen verificacion de autenticidad y caja original.",
            "Envios express gratis a toda Colombia por compras desde $300.000 COP.",
            "Despachos express en Bogota y Medellin entre 24 y 48 horas habiles.",
            "Resto de Colombia entre 2 y 4 dias habiles con guia asegurada.",
            "Cambios por talla disponibles dentro de los 30 dias calendario siguientes.",
            "Conserve la suela limpia y las etiquetas intactas para tramitar cambio.",
            "Atencion VIP y pedidos verificados por WhatsApp: +57 317 657 6059.",
        ],
        [
            "PROTOCOLO DE CUIDADO PARA GAMUZA, CUERO Y LONA",
            "Gamuza (Samba OG, Campus 00s, Handball Spezial, Puma Suede XL):",
            "Limpiar en seco con cepillo de cerdas suaves y aplicar protector hidrofugo.",
            "Cuero liso (Air Force 1, Stan Smith, Superstar, Jordan 1 Low, NB 550):",
            "Limpiar con pano humedo y jabon neutro; nunca usar lavadora.",
            "Lona (Converse Chuck Taylor, Vans Old Skool): lavar a mano sin cloro.",
            "Evitar exposicion directa al sol despues de limpiar para conservar el color.",
        ],
    ]
    font = ImageFont.load_default(size=24) if hasattr(ImageFont, "load_default") else None

    for lines in lines_per_page:
        img = Image.new("RGB", (1400, 1800), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        y = 110
        for line in lines:
            if font is not None:
                draw.text((70, y), line, fill=(15, 23, 42), font=font)
            else:
                draw.text((70, y), line, fill=(15, 23, 42))
            y += 95
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
