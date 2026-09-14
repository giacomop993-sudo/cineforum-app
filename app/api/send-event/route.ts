import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { movieTitle, scheduledFor, userEmails, posterUrl, overview, director, genres, releaseYear } = await request.json();

    // Creazione del file .ics per il calendario
    const eventDate = new Date(scheduledFor);
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const startDate = formatDate(eventDate);
    const endDate = formatDate(new Date(eventDate.getTime() + 3 * 60 * 60 * 1000));

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cineforum App//IT
BEGIN:VEVENT
SUMMARY:Proiezione Cineforum: ${movieTitle}
DESCRIPTION:Serata cineforum dedicata alla visione e votazione del film: ${movieTitle}.
DTSTART:${startDate}
DTEND:${endDate}
END:VEVENT
END:VCALENDAR`;

    // Email HTML ricca di stile con la locandina e i dettagli del film
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #111827; color: #f3f4f6; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #60a5fa; margin: 0; font-size: 24px;">🎬 Cineforum App</h1>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 5px;">Nuovo appuntamento programmato!</p>
        </div>

        <div style="background-color: #1f2937; border: 1px solid #374151; border-radius: 10px; overflow: hidden; padding: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              ${posterUrl ? `
                <td style="width: 35%; vertical-align: top; padding-right: 15px;">
                  <img src="${posterUrl}" alt="${movieTitle}" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);" />
                </td>
              ` : ''}
              <td style="vertical-align: top; width: ${posterUrl ? '65%' : '100%'};">
                <h2 style="margin: 0 0 8px 0; color: #ffffff; font-size: 22px;">${movieTitle} <span style="font-size: 16px; color: #9ca3af; font-weight: normal;">(${releaseYear || 'N/D'})</span></h2>
                <p style="margin: 6px 0; font-size: 13px; color: #d1d5db;"><strong>Regista:</strong> ${director || 'Sconosciuto'}</p>
                <p style="margin: 6px 0; font-size: 13px; color: #d1d5db;"><strong>Genere:</strong> ${genres || 'N/D'}</p>
                <p style="margin: 12px 0 4px 0; font-size: 13px; color: #9ca3af;"><strong>Data e Ora:</strong></p>
                <p style="margin: 0; font-size: 15px; color: #60a5fa; font-weight: bold;">${new Date(scheduledFor).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</p>
              </td>
            </tr>
          </table>

          ${overview ? `
            <div style="margin-top: 20px; border-top: 1px solid #374151; padding-top: 15px;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #9ca3af; font-weight: bold;">Trama:</p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #e5e7eb;">${overview}</p>
            </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin-top: 25px; color: #9ca3af; font-size: 12px;">
          <p>In allegato trovi il file <strong>.ics</strong> per aggiungere l'evento direttamente al tuo calendario.</p>
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: 'Cineforum <onboarding@resend.dev>',
      to: userEmails,
      subject: `🎬 Cineforum: ${movieTitle}`,
      html: emailHtml,
      attachments: [
        {
          filename: 'cineforum-evento.ics',
          content: Buffer.from(icsContent).toString('base64'),
        },
      ],
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}