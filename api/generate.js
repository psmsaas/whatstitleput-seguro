export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;

        const { base64ImageData, mimeType, userTimeZone, generationMode, textPrompt } = req.body;

        // VERIFICACIÓN: Debe haber O una imagen O un texto (o ambos)
        if (!base64ImageData && !textPrompt) {
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
            
            Tu tarea es evaluar la imagen proporcionada o responder a la consulta del usuario sobre fotografía y presentación.
            Si el usuario envía una imagen, evalúa la iluminación, el fondo y si el producto es el protagonista indiscutido.
            
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
            ACTÚA COMO UN EXPERTO 'CLOSER' DE VENTAS, ESPECIALISTA EN NEUROMARKETING Y ATENCIÓN AL CLIENTE.
            
            El usuario te hará una consulta escrita sobre una venta, objeción de un cliente, O te enviará una captura de un chat (WhatsApp/Instagram).
            Tu objetivo es analizar la situación (precio, dudas, tiempo, "lo pienso y te aviso") y ayudar al usuario a destrabar y cerrar la venta dándole un consejo y opciones para copiar y pegar.
            
            REGLAS DE EVALUACIÓN Y RESPUESTA:
            1. Diagnostica rápidamente qué está frenando al cliente basándote en la consulta o imagen.
            2. Proporciona 2 o 3 opciones exactas de respuesta que el usuario pueda copiar y pegar, usando técnicas de persuasión y neuromarketing.
            
            FORMATO DE SALIDA ESPERADO (ESTRICTO HTML):
            <h3>Diagnóstico de la situación: 🕵🏻‍♂️</h3><br>
            [Breve análisis directo de 2 líneas sobre la objeción o situación del cliente]<br><br>
            <strong>Opción 1: Cierre Empático 🤝</strong><br>
            <em>"[Texto exacto y persuasivo para copiar, pegar y enviar al cliente]"</em><br>
            <span style="color:gray; font-size:13px;">(Por qué funciona: [Explicación psicológica])</span><br><br>
            <strong>Opción 2: Cierre por Escasez / Urgencia ⏰</strong><br>
            <em>"[Texto exacto y persuasivo para copiar, pegar y enviar al cliente]"</em><br>
            <span style="color:gray; font-size:13px;">(Por qué funciona: [Explicación psicológica])</span><br><br>
            <strong>Próximo paso:</strong> [Consejo sobre qué hacer si el cliente no responde].
            `;
        } else {
            // E-COMMERCE MODE
            modeInstructions = `
            ACTÚA COMO UN COPYWRITER EXPERTO EN SEO ON-PAGE PARA E-COMMERCE.
            
            REGLAS ESTRICTAS DE MATERIALES:
            PROHIBIDO decir "Oro", "Plata", "Diamante". Usa "Acero Quirúrgico", "Símil Oro", "Color Dorado", "Plateado".
            
            REGLAS DEL TÍTULO:
            ESTRUCTURA: [Producto] + [Característica Principal] + [Material] + [Público]. NUNCA uses símbolos como "|", "-", ":". Cero marketing barato en el título.
            
            REGLAS DE DESCRIPCIÓN:
            Ficha técnica en viñetas (-) y luego un párrafo de venta persuasivo. SIN hashtags.
            
            FORMATO DE SALIDA ESPERADO (ESTRICTO HTML - NUNCA USES LISTAS NUMERADAS):
            <strong>Título:</strong> [Título SEO Long-Tail]<br><br>
            <strong>Descripción:</strong><br>
            [Lista de viñetas técnicas]<br><br>
            [Párrafo de venta persuasivo]
            `;
        }

        // CONSTRUCCIÓN DINÁMICA DEL PROMPT (Dependiendo si hay texto, imagen o ambos)
        const partsArray = [];
        
        let contextualInstruction = "";
        if (textPrompt && base64ImageData) {
            contextualInstruction = `Consulta/Contexto del usuario: "${textPrompt}"\n\nInstrucción: Analiza la imagen adjunta basándote en la consulta del usuario. CUMPLE ESTRICTAMENTE CON TODAS LAS REGLAS DE ESTRUCTURA Y FORMATO DE TU ROL.`;
        } else if (textPrompt && !base64ImageData) {
            contextualInstruction = `Consulta del usuario: "${textPrompt}"\n\nInstrucción: Responde a la consulta del usuario de la mejor forma posible. CUMPLE ESTRICTAMENTE CON TODAS LAS REGLAS DE ESTRUCTURA Y FORMATO DE TU ROL. Si tu formato pide evaluar una imagen y no la hay, adapta el formato para dar el mejor consejo escrito posible.`;
        } else {
            contextualInstruction = `Instrucción: Analiza la imagen adjunta. CUMPLE ESTRICTAMENTE CON TODAS LAS REGLAS DE ESTRUCTURA Y FORMATO PROVISTAS EN LAS INSTRUCCIONES DEL SISTEMA.`;
        }

        partsArray.push({ text: contextualInstruction });

        if (base64ImageData) {
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

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error Details:", errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        res.status(200).json(result);

    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
}
