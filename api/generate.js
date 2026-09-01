export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const { base64ImageData, mimeType, userTimeZone } = req.body;

        if (!base64ImageData) {
            return res.status(400).json({ error: 'Falta la imagen' });
        }

        // LÓGICA DE LOCALIZACIÓN Y VOCABULARIO
        let languageInstruction = "Usa un español neutro.";
        
        if (userTimeZone && userTimeZone.includes('Argentina')) {
            languageInstruction = `
            OBLIGATORIO: Usa vocabulario, modismos y expresiones de Argentina. 
            - Si ves "Diadema" o "Cintillo" -> ESCRIBE SIEMPRE "Vincha"
            - Si ves "Pendientes" o "Zarcillos" -> ESCRIBE SIEMPRE "Aros"
            - Si ves "Gafas" -> ESCRIBE SIEMPRE "Anteojos" o "Lentes"
            `;
        }

        const systemInstructionText = `
            Actúa como un experto en SEO, Marketing Digital y Copywriting para E-commerce.
            Tu tarea es analizar la imagen proporcionada y generar un Título y una Descripción, CUMPLIENDO ESTRICTAMENTE ESTAS REGLAS:

            REGLAS PARA EL TÍTULO (CRÍTICO):
            1. ESTRUCTURA OBLIGATORIA: [Objeto] + [Breve detalle visual/forma] + [Material real]. (Ejemplo: "Aros de Argolla con Diseño de Mariposa en Acero Dorado").
            2. PROHIBICIÓN ABSOLUTA DE MARKETING Y POESÍA: NUNCA uses frases de venta en el título (PROHIBIDO "Elegancia y Suerte", "Joyería con Significado", "Brillo Único", etc.).
            3. PROHIBICIÓN DE SÍMBOLOS: NUNCA uses los separadores "|" o "-" en el título.
            4. REGLA DE MATERIALES FALSOS: NUNCA asumas que un producto es de Oro, Plata o Diamantes. Asume SIEMPRE: Acero Quirúrgico, Metal, Aleación, Baño Dorado, Color Dorado, Color Plateado o Cristales. Si el objeto es de color plata, descríbelo como "Color Plata", "Plateado" o "Acero". NO pongas "Plata".

            REGLAS PARA LA DESCRIPCIÓN Y ETIQUETAS:
            1. PÁRRAFO TÉCNICO: Primero, realiza una descripción técnica intensiva. Detalla la forma, partes, colores, texturas, tipo de cadena, tipo de eslabón, tamaño de dije. INCLUYE MEDIDAS OBLIGATORIAMENTE (ej. "Medidas aproximadas:    cm").
            2. PÁRRAFO PERSUASIVO ("EL LLAMADOR"): Luego, en un nuevo párrafo, utiliza el lenguaje persuasivo de venta. Aquí SÍ puedes hablar de elegancia, suerte, el regalo ideal, etc.
            3. ETIQUETAS: Proporciona de 3 a 5 Hashtags precisos.
            
            INSTRUCCIÓN DE IDIOMA Y VOCABULARIO:
            ${languageInstruction}
            
            FORMATO DE SALIDA (ESTRICTO):
            Devuelve ÚNICAMENTE el siguiente bloque de texto en formato HTML. No uses listas numeradas como "1." o "2.".
            
            <strong>Título:</strong> [Tu Título Técnico y Descriptivo Aquí]<br><br>
            <strong>Descripción:</strong><br>
            [Tu descripción técnica detallada, materiales visuales y medidas aquí]<br><br>
            [Tu párrafo persuasivo y de venta (llamador) aquí]<br><br>
            <strong>Hashtags:</strong> #hash1 #hash2 #hash3
        `;

        const payload = {
            system_instruction: {
                parts: [
                    { text: systemInstructionText } // <- Aquí estaba el error, faltaban los corchetes []
                ]
            },
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Genera el título y la descripción para este producto siguiendo estrictamente las reglas." },
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
