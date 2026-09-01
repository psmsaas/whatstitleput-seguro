export default async function handler(req, res) {
    // Solo permitir solicitudes POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // La clave API ahora se lee de las variables de entorno del servidor (seguro)
        const API_KEY = process.env.GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;

        // Obtener los datos (la imagen en base64) que envió el frontend
        const { base64ImageData, mimeType } = req.body;

        if (!base64ImageData) {
            return res.status(400).json({ error: 'Falta la imagen' });
        }

        const systemPrompt = `
            Actúa como un experto en SEO, Marketing Digital y Copywriting.
            Voy a proporcionarte una imagen. Tu tarea es analizar detalladamente el contenido visual y generar lo siguiente:
            
            1. Un Título (Title Tag) altamente optimizado para SEO basado en lo que ves en la imagen. Debe ser atractivo, incluir palabras clave relevantes, fomentar el clic (CTR) y tener una longitud máxima de 60 caracteres.
            2. Una breve descripción (Meta Description) de máximo 150 caracteres que complemente el título y resuma el contenido de forma persuasiva.
            3. 3 a 5 Etiquetas o Hashtags (#) relevantes para clasificar el contenido.
            
            Formatea tu respuesta de forma clara usando HTML (por ejemplo, usando etiquetas <strong> para resaltar las partes). No agregues texto adicional al principio ni al final.
        `;

        // Preparar la llamada a Gemini
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: systemPrompt },
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

        // Hacer la petición a Gemini
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
        
        // Devolver la respuesta de Gemini al frontend
        res.status(200).json(result);

    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}