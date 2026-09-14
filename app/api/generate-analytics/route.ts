import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const { totalMovies, topGenre, avgVote, totalHours, movieTitles } = await request.json();

    if (totalMovies === 0) {
      return NextResponse.json({ 
        comment: "Il proiettore è ancora spento. Aggiungete e votate qualche film per scoprire di che pasta è fatto questo cineforum!" 
      });
    }

    const prompt = `
      Sei un critico cinematografico ironico, appassionato e pungente. 
      Devi analizzare le statistiche di un gruppo di cineforum e scrivere un breve commento (massimo 3 o 4 frasi) sul loro profilo.
      
      Ecco i dati del gruppo:
      - Film visti: ${totalMovies}
      - Ore totali di visione: ${totalHours}
      - Genere più visto: ${topGenre || 'Misto'}
      - Voto medio globale: ${avgVote}/10
      - Titoli che hanno visto di recente: ${movieTitles}
      
      Scrivi un commento che gli assegni un "Titolo Cinefilo" all'inizio.
      Fai obbligatoriamente almeno una battuta sarcastica o un riferimento specifico a uno o più titoli che hanno visto per rendere l'analisi molto personalizzata e tagliente. 
      Sii conciso, niente convenevoli. Non usare markdown come ** o *.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    const comment = response.text;

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error("Errore Gemini API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}