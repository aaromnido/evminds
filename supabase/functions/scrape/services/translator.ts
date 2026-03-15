/**
 * Service: Translation of English articles to Spanish using OpenAI GPT-4o mini
 * Handles translation of both title and excerpt with journalism-focused prompts
 */

interface TranslationResult {
  title: string;
  excerpt: string;
}

/**
 * Translates English article content to Spanish using OpenAI API
 * @param title - Original English title
 * @param excerpt - Original English excerpt/description
 * @param openaiKey - OpenAI API key
 * @returns Translated title and excerpt
 */
export async function translateToSpanish(
  title: string,
  excerpt: string,
  openaiKey: string
): Promise<TranslationResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un traductor especializado en noticias sobre vehículos eléctricos. Traduce al español de España (ES-ES) de forma natural y periodística. Mantén el tono y estilo del original.'
          },
          {
            role: 'user',
            content: `Traduce al español:\n\nTítulo: ${title}\n\nExtracto: ${excerpt}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const translated = data.choices[0].message.content;

    // Parse translation to extract title and excerpt
    const titleMatch = translated.match(/Título:\s*(.+?)(?:\n|$)/i);
    const excerptMatch = translated.match(/Extracto:\s*(.+)/is);

    return {
      title: titleMatch?.[1]?.trim() || title,
      excerpt: excerptMatch?.[1]?.trim() || excerpt
    };
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback: return original text if translation fails
    return { title, excerpt };
  }
}
