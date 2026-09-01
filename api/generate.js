export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        // Cambiamos el modelo a gemini-1.5-flash, que es el más estable y rápido para analizar imágenes actualmente
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        // Recibimos la imagen y la zona horaria enviada desde el frontend
        const { base64ImageData, mimeType, userTimeZone } = req.body;

        if (!base64ImageData) {
            return res.status(400).json({ error: 'Falta la imagen' });
        }

        // LÓGICA DE LOCALIZACIÓN Y VOCABULARIO
        let languageInstruction = "Usa un español neutro.";
        
        // Si detectamos que el usuario está en Argentina
        if (userTimeZone && userTimeZone.includes('Argentina')) {
            languageInstruction = `
            OBLIGATORIO: Usa vocabulario, modismos y expresiones típicas de Argentina para E-commerce (estilo MercadoLibre). 
            
            DICCIONARIO DE TRADUCCIÓN OBLIGATORIA (REEMPLAZA SIEMPRE):
            - Si ves una "Diadema" o "Cintillo" -> ESCRIBE SIEMPRE "Vincha"
            - Si ves "Pendientes" o "Zarcillos" -> ESCRIBE SIEMPRE "Aros"
            - Si ves "Gafas" o "Espejuelos" -> ESCRIBE SIEMPRE "Anteojos" o "Lentes"

            `;
        } else if (userTimeZone && userTimeZone.includes('Madrid')) {
             languageInstruction = "Usa vocabulario típico de España (ej. 'pendientes', 'anillos').";
        }

        const systemInstructionText = `
            Actúa como un experto en SEO, Marketing Digital y Copywriting para E-commerce.
            Tu tarea es analizar la imagen proporcionada y generar un Título y una Descripción, CUMPLIENDO ESTRICTAMENTE ESTAS REGLAS:

            REGLAS PARA EL TÍTULO (CRÍTICO - SI FALLAS, LA APLICACIÓN SE ROMPE):
            1. ESTRUCTURA OBLIGATORIA: [Objeto] + [Marca si es muy evidente, si no ignorar] + [Breve detalle visual/forma] + [Material real].
            2. PROHIBICIÓN ABSOLUTA DE MARKETING: NUNCA uses frases poéticas, emotivas, de venta, o abstractas en el título (Ej: PROHIBIDO USAR "Elegancia y Suerte", "Joyería con Significado", "Brillo Único", "Ideal para Regalar"). El título debe describir el producto sin adjetivos subjetivos.
            3. PROHIBICIÓN DE SÍMBOLOS: NUNCA uses el símbolo separador "|" o "-" seguido de frases de marketing en el título.
            4. REGLA DE MATERIALES: NUNCA asumas que un producto es de Oro, Plata o Diamantes. Asume por defecto: Acero Quirúrgico, Metal, Aleación, Simil Oro, Baño Dorado, Color Dorado, Color Plateado, Cristales o Strass, a menos que un sello sea claramente legible. Si el objeto de la foto es de color plata, descríbelo como "Plateado" o "Color Plata", no como "Plata" ni "Plata 925".

            REGLAS PARA LA DESCRIPCIÓN Y ETIQUETAS:
            1. Primero, realiza una descripción técnica y detallada del producto. Incluye todos los detalles visuales de la foto: forma, partes, colores, texturas. Incluye medidas aproximadas obligatoriamente (ej. "Medidas: [espacio en blanco] cm"). Describe si tiene cadena, tipo de eslabón, tamaño relativo del dije. Esto debe ser un análisis intensivo de lo visual.
            2. Luego, en un nuevo párrafo, puedes utilizar lenguaje persuasivo y de venta (el "llamador") destacando por qué deberían comprarlo, usos sugeridos o el público al que va dirigido.
            3. Proporciona de 3 a 5 Etiquetas o Hashtags relevantes y precisos que describan físicamente al producto.
            
            INSTRUCCIÓN DE IDIOMA Y VOCABULARIO (CRÍTICO):
            ${languageInstruction}
            
            FORMATO DE SALIDA (ESTRICTO):
            Devuelve ÚNICAMENTE el siguiente bloque de texto en formato HTML. NO incluyas markdown \`\`\`html.
            Respeta las etiquetas <strong>. No uses listas numeradas (Ej, no pongas "1. Título"). NO cambies las palabras "Título:" y "Descripción:".
            
            <strong>Título:</strong> [Tu Título Descriptivo Aquí]<br><br>
            <strong>Descripción:</strong><br>
            [Tu descripción detallada técnica, material visual, forma, eslabones, tipo de cierre, todo lo que ves, medidas aproximadas aquí]<br><br>
            [Tu párrafo persuasivo y de venta aquí]<br><br>
            <strong>Hashtags:</strong> #hash1 #hash2 #hash3
        `;

        const payload = {
            system_instruction: {
                parts: {
                    text: systemInstructionText
                }
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
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        res.status(200).json(result);

    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
