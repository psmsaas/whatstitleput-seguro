export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        // Se utiliza el modelo 3.5-flash actualizado
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;

        const { base64ImageData, mimeType, userTimeZone, generationMode } = req.body;

        if (!base64ImageData) {
            return res.status(400).json({ error: 'Falta la imagen' });
        }

        let languageInstruction = `Usa un español neutro.`;
        if (userTimeZone && userTimeZone.includes('Argentina')) {
            languageInstruction = `
            OBLIGATORIO: Usa vocabulario, modismos y términos ESTRICTOS de Argentina.
            Reemplazos OBLIGATORIOS:
            - "Diadema" o "Cintillo" -> ESCRIBE SIEMPRE "Vincha"
            - "Pendientes" o "Zarcillos" -> ESCRIBE SIEMPRE "Aros"
            - "Gafas" -> ESCRIBE SIEMPRE "Anteojos" o "Lentes"
            - "Gargantilla" -> Usa preferentemente "Collar corto" o "Choker"
            - "Tobillera" -> Manten "Tobillera"
            - "Anillo" -> Manten "Anillo"
            - "Pulsera" -> Manten "Pulsera"
            `;
        }

        let modeInstructions = "";

        if (generationMode === 'social') {
            modeInstructions = `
            ACTÚA COMO UN COMMUNITY MANAGER EXPERTO EN SEO PARA REDES SOCIALES (INSTAGRAM/TIKTOK).
            
            REGLAS PARA LA DESCRIPCIÓN (CAPTION OPTIMIZADO PARA ALGORITMOS):
            1. Tono elegante, persuasivo y cercano. Atrapa la atención en la primera línea para mejorar el watch-through rate.
            2. SEO EN TEXTO: Integra palabras clave (keywords) de búsqueda de forma natural a lo largo de la descripción (las redes ahora indexan el texto).
            3. PROHIBIDO GENERAR UN TÍTULO. Ve directo a la descripción.
            4. ESTRUCTURA: [Línea de gancho] + [Descripción de beneficios y visuales integrando keywords] + [Llamado a la acción suave].
            
            REGLAS ESTRICTAS DE MATERIALES (PREVENIR RECLAMOS):
            1. PROHIBIDO decir "Oro", "Plata", "Diamante" a menos que haya un sello muy claro.
            2. Usa SIEMPRE términos precisos: "Acero Quirúrgico", "Símil Oro", "Color Dorado", "Plateado", "Aleación de Metal", "Cristales", "Strass". 
            
            REGLAS PARA HASHTAGS (ESTRATEGIA DE ALCANCE ORGÁNICO):
            Genera un máximo de 6 hashtags siguiendo esta mezcla exacta:
            - 2 Hashtags de nicho (muy específicos, ej. #ArosAceroQuirurgico)
            - 2 Hashtags descriptivos (qué se ve en la foto)
            - 2 Hashtags de categoría amplia/tendencia (ej. #ModaArgentina, #AccesoriosMujer)
            
            FORMATO DE SALIDA ESPERADO (ESTRICTO HTML):
            [Tu descripción elegante y SEO optimizada aquí, usa 1-2 emojis sutiles]<br><br>
            <strong>Hashtags:</strong> #hash1 #hash2 #hash3 #hash4 #hash5
            `;
        } else {
            // E-COMMERCE MODE (Por defecto) - ENFOQUE SEO ON-PAGE
            modeInstructions = `
            ACTÚA COMO UN COPYWRITER EXPERTO EN SEO ON-PAGE PARA E-COMMERCE.
            
            REGLAS ESTRICTAS PARA EL TÍTULO (H1 / TITLE TAG OPTIMIZADO PARA GOOGLE):
            1. ESTRUCTURA OBLIGATORIA DE LONG-TAIL KEYWORD: [Producto] + [Característica Principal/Diseño] + [Material] + [Género/Público (si aplica)].
               - CORRECTO: "Aros Argolla con Dije de Estrella en Acero Plateado para Mujer"
               - INCORRECTO: "Aros Estrella | Suerte y Brillo" (Demasiado poético, mala keyword)
            2. PROHIBICIONES EN EL TÍTULO: 
               - NUNCA uses símbolos como "|" o "-".
               - NUNCA incluyas palabras de marketing, emociones o adjetivos vacíos ("Elegancia", "Suerte", "Brillo Único", "Hermoso", "Regalo").
            
            REGLAS ESTRICTAS DE MATERIALES (PREVENIR RECLAMOS Y FALSAS KEYWORDS):
            1. PROHIBIDO decir "Oro", "Plata", "Diamante" o "Zafiro" a menos que haya un sello muy claro.
            2. Usa términos precisos de bisutería: "Acero Quirúrgico", "Símil Oro", "Color Dorado", "Plateado", "Color Plata", "Aleación de Metal", "Cristales", "Strass".
            3. Si ves algo gris metálico, no digas plata. Di "Plateado" o "Acero".
            
            REGLAS PARA LA DESCRIPCIÓN (METADESCRIPTION Y FICHA DE PRODUCTO):
            1. PRIMERA PARTE (Ficha Técnica SEO): Usa formato de viñetas claras (-). Detalla medidas (deja espacio en blanco si no lo sabes: [___] cm), tipo de cierre, material exacto y características visuales clave (keywords secundarias).
            2. SEGUNDA PARTE (Persuasión y Conversión): Escribe un párrafo de venta persuasivo. AQUÍ SÍ puedes hablar de elegancia, ocasiones de uso y usar un llamado a la acción (ej. "Añádelo a tu carrito").
            
            FORMATO DE SALIDA ESPERADO (ESTRICTO HTML - PROHIBIDO USAR LISTAS NUMERADAS "1.", "2." EN LOS ENCABEZADOS):
            <strong>Título:</strong> [Tu Título SEO Long-Tail Aquí sin frases de marketing]<br><br>
            <strong>Descripción:</strong><br>
            [Lista de viñetas técnicas y de medidas aquí]<br><br>
            [Párrafo de venta persuasivo aquí]
            `;
        }

        const payload = {
            system_instruction: {
                parts: [
                    { text: languageInstruction },
                    { text: modeInstructions }
                ]
            },
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Genera el texto para este producto. CUMPLE ESTRICTAMENTE CON TODAS LAS REGLAS DE ESTRUCTURA Y FORMATO PROVISTAS EN LAS INSTRUCCIONES DEL SISTEMA." },
                        {
                            inlineData: {
                                mimeType: mimeType || 'image/jpeg',
                                data: base64ImageData
                            }
                        }
                    ]
                }
            ]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error Details:", errorText);
            throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        res.status(200).json(result);

    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
