export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        // Leemos los datos que nos envía el frontend (una imagen, texto, o ambos)
        const { base64ImageData, mimeType, userTimeZone, generationMode, textPrompt } = req.body;

        const hasImage = !!base64ImageData;
        if (!hasImage && !textPrompt) {
            return res.status(400).json({ error: 'Falta la consulta de texto o la imagen' });
        }

        let languageInstruction = `Usa un español neutro.`;
        if (userTimeZone && userTimeZone.includes('Argentina')) {
            languageInstruction = `
            OBLIGATORIO: Usa vocabulario, modismos y términos ESTRICTOS de Argentina.
            Reemplazos OBLIGATORIOS:
            - "Diadema" o "Cintillo" -> ESCRIBE SIEMPRE "Vincha"
            - "Pendientes" o "Zarcillos" -> ESCRIBE SIEMPRE "Aros"
            - "Gafas" -> ESCRIBE SIEMPRE "Anteojos" o "Lentes"
            - "Bolso" -> ESCRIBE SIEMPRE "Cartera" o "Bandolera"
            - "Sujetador" -> ESCRIBE SIEMPRE "Corpiño"
            - "Falda" -> ESCRIBE SIEMPRE "Pollera"
            - "Camiseta" o "Playera" -> ESCRIBE SIEMPRE "Remera"
            - "Jersey" o "Suéter" -> ESCRIBE SIEMPRE "Saco", "Pulóver" o "Cárdigan"
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
            
            REGLA VITAL DE ENFOQUE (SOLO ACCESORIOS):
            Si hay una imagen de una modelo, IGNORA POR COMPLETO SU ROPA. ESTAMOS VENDIENDO SUS ACCESORIOS. Describe CÓMO los accesorios complementan el look, pero NUNCA describas su indumentaria.
            
            REGLAS ESTRICTAS DE MATERIALES:
            1. PROHIBIDO decir "Oro", "Plata", "Diamante" a menos que se te indique explícitamente.
            2. Usa SIEMPRE términos precisos: "Acero Quirúrgico", "Símil Oro", "Color Dorado", "Plateado", "Cristales". 
            
            REGLAS PARA LA DESCRIPCIÓN Y HASHTAGS:
            1. Tono elegante, persuasivo y cercano.
            2. SEO EN TEXTO: Integra palabras clave de forma natural.
            3. ESTRUCTURA: [Gancho enfocado en accesorio] + [Beneficios estéticos] + [Llamado a la acción suave].
            4. Genera máximo 6 hashtags (2 nicho, 2 descriptivos, 2 amplia).
            
            FORMATO DE SALIDA ESPERADO (ESTRICTO HTML):
            [Descripción elegante y SEO optimizada]<br><br>
            <strong>Hashtags:</strong> #hash1 #hash2 #hash3 #hash4 #hash5
            `;
        } else if (generationMode === 'audit') {
            modeInstructions = `
            ACTÚA COMO UN EXPERTO EN FOTOGRAFÍA DE PRODUCTO Y SEO VISUAL PARA E-COMMERCE.
            
            Tu tarea es evaluar las imágenes proporcionadas o responder a la consulta del usuario sobre fotografía y presentación.
            Evalúa la iluminación, el fondo y si el producto es el protagonista indiscutido.
            
            FORMATO DE SALIDA ESPERADO (ESTRICTO HTML):
            <h3>Puntuación General: [Puntaje del 1 al 10] ⭐️</h3><br>
            <strong>Fortalezas:</strong><br>
            - [Punto fuerte 1]<br>
            - [Punto fuerte 2]<br><br>
            <strong>Áreas de Mejora:</strong><br>
            - [Recomendación 1]<br>
            - [Recomendación 2]<br><br>
            <strong>Veredicto Comercial:</strong> [Breve conclusión de 2 líneas].
            `;
        } else if (generationMode === 'advisor') {
            modeInstructions = `
            ACTÚA COMO UN EXPERTO 'CLOSER' DE VENTAS Y ESPECIALISTA EN NEUROMARKETING Y ATENCIÓN AL CLIENTE.
            
            El usuario te hará una consulta escrita sobre ventas o enviará una captura de chat.
            Tu objetivo es dar un consejo estratégico y opciones de respuesta listas para copiar y pegar.
            
            FORMATO DE SALIDA ESPERADO (ESTRICTO HTML):
            <h3>Diagnóstico: 🕵🏻‍♂️</h3><br>
            [Breve análisis directo de la situación]<br><br>
            <strong>Opción 1: Cierre Empático 🤝</strong><br>
            <em>"[Texto persuasivo para copiar, pegar y enviar al cliente]"</em><br>
            <span style="color:gray; font-size:13px;">(Por qué funciona: [Explicación psicológica])</span><br><br>
            <strong>Opción 2: Cierre por Escasez / Urgencia ⏰</strong><br>
            <em>"[Texto persuasivo para copiar, pegar y enviar al cliente]"</em><br>
            <span style="color:gray; font-size:13px;">(Por qué funciona: [Explicación psicológica])</span><br><br>
            <strong>Consejo extra:</strong> [Breve recomendación adicional].
            `;
        } else {
            // E-COMMERCE MODE (Con reglas estrictas de títulos cortos)
            modeInstructions = `
            ACTÚA COMO UN COPYWRITER EXPERTO EN SEO PARA E-COMMERCE.
            
            REGLAS ESTRICTAS DE MATERIALES:
            PROHIBIDO decir "Oro", "Plata", "Diamante". Usa "Acero Quirúrgico", "Símil Oro", "Color Dorado", "Plateado", "Strass", "Cristales".
            
            REGLAS DEL TÍTULO (¡CRÍTICO!):
            1. CORTO Y DIRECTO: Máximo 5 a 6 palabras.
            2. ESTRUCTURA ESTRICTA: [Tipo de Accesorio] + [Detalle visual] + en + [Material]. Ejemplo: "Collar Choker con Strass en Acero Quirúrgico".
            3. PROHIBICIÓN ABSOLUTA DE RELLENO: NO uses palabras como "Elegante", "Hermoso", "Exclusivo", "Chic", "Para Mujer", "Moda", "Estilo", "Impresionante".
            4. NUNCA uses símbolos como "|", "-", ":". 
            
            REGLAS DE DESCRIPCIÓN:
            Ficha técnica en viñetas (-) y luego un párrafo de venta persuasivo y cercano. SIN hashtags.
            
            FORMATO DE SALIDA ESPERADO (ESTRICTO HTML - NUNCA USES LISTAS NUMERADAS):
            <strong>Título:</strong> [Título corto y 100% descriptivo]<br><br>
            <strong>Descripción:</strong><br>
            [Lista de viñetas técnicas]<br><br>
            [Párrafo de venta persuasivo]
            `;
        }

        const partsArray = [];
        let contextualInstruction = "";

        if (textPrompt && hasImage) {
            contextualInstruction = `Consulta del usuario: "${textPrompt}"\n\nInstrucción: Analiza la imagen adjunta basándote en la consulta del usuario. CUMPLE ESTRICTAMENTE CON TODAS LAS REGLAS DE ESTRUCTURA Y FORMATO DE TU ROL.`;
        } else if (textPrompt && !hasImage) {
            contextualInstruction = `Consulta del usuario: "${textPrompt}"\n\nInstrucción: Responde a la consulta de la mejor forma posible. CUMPLE ESTRICTAMENTE CON LAS REGLAS DE ESTRUCTURA Y FORMATO DE TU ROL.`;
        } else {
            contextualInstruction = `Instrucción: Analiza la imagen adjunta. CUMPLE ESTRICTAMENTE CON TODAS LAS REGLAS DE ESTRUCTURA Y FORMATO PROVISTAS EN LAS INSTRUCCIONES DEL SISTEMA.`;
        }

        partsArray.push({ text: contextualInstruction });

        if (hasImage) {
            partsArray.push({
                inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: base64ImageData
                }
            });
        }

        const payload = {
            systemInstruction: {
                parts: [
                    { text: languageInstruction },
                    { text: modeInstructions }
                ]
            },
            contents: [
                {
                    role: "user",
                    parts: partsArray
                }
            ]
        };

        const fallbackModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash'];
        let resultData = null;
        let lastErrorText = "";

        for (const modelName of fallbackModels) {
            try {
                let retries = 3;
                while (retries > 0) {
                    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                    
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        resultData = await response.json();
                        retries = 0; // Rompemos el While
                        break; // Rompemos el For de modelos
                    } else if (response.status === 503 || response.status === 429) {
                        console.warn(`[${modelName}] Servidor saturado (${response.status}). Reintentando...`);
                        retries--;
                        if (retries > 0) {
                            await new Promise(res => setTimeout(res, 2000));
                        } else {
                            throw new Error(`API Error: ${response.status}`);
                        }
                    } else {
                        throw new Error(`API Error Crítico: ${response.status}`);
                    }
                }
                if (resultData) break;
            } catch (e) {
                console.error(`Fallo intentando con ${modelName}:`, e.message);
                lastErrorText = e.message;
            }
        }

        if (!resultData) {
            throw new Error(`Todos los modelos fallaron. Último error: ${lastErrorText}`);
        }

        return res.status(200).json(resultData);

    } catch (error) {
        console.error('Error final devuelto al usuario:', error);
        return res.status(500).json({ error: 'Error procesando la solicitud en el servidor' });
    }
}
