import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config/index.js';
import { NotificationPayload } from '../types/index.js';
import { BASE_NTFY_SERVER, getMunicipalityTopic } from './ntfyTopics.js';

export class NotificationService {
  private mailTransporter: Transporter | null = null;

  constructor() {
    if (config.smtp.enabled && config.smtp.auth.user) {
      this.mailTransporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.auth.user,
          pass: config.smtp.auth.pass,
        },
      });
    }
  }

  /**
   * Wysyła powiadomienia równolegle:
   * 1. Do kanału zbiorczego ntfy (wszystkie gminy)
   * 2. Do dedykowanego kanału ntfy dla danej gminy (np. radypowiatuturek_turek)
   * 3. Na e-mail przez Nodemailer (jeśli skonfigurowano SMTP)
   */
  public async send(payload: NotificationPayload): Promise<void> {
    const isNew = payload.changeType === 'NEW';
    const actionLabel = isNew ? 'Nowe posiedzenie' : 'Aktualizacja posiedzenia';
    const subject = `[${payload.meeting.municipality}] ${actionLabel}: ${payload.meeting.title}`;

    let bodyText = `Gmina / Jednostka: ${payload.meeting.municipality}\n`;
    bodyText += `Typ: ${payload.meeting.type}\n`;
    bodyText += `Tytuł: ${payload.meeting.title}\n`;
    bodyText += `Termin: ${payload.meeting.date}\n`;
    bodyText += `Status: ${payload.meeting.status}\n`;
    bodyText += `Szczegóły: ${payload.meeting.url}\n`;

    if (!isNew && payload.changesSummary) {
      bodyText += `\nZmiany:\n${payload.changesSummary}\n`;
    }

    const tasks: Promise<void>[] = [];

    // 1. Wysyłka do ntfy.sh (kanał globalny oraz dedykowany kanał gminy)
    if (config.ntfy.enabled) {
      tasks.push(this.sendNtfyMultiChannel(subject, bodyText, payload));
    }

    // 2. Email wyłączony w projekcie sesjeTurek zgodnie z wymaganiami
    // (nie wysyłamy powiadomień emailowych)

    // Równoległe wykonanie z izolacją błędów
    await Promise.allSettled(tasks);
  }


  /**
   * Publikuje alert zarówno na kanale zbiorczym, jak i na dedykowanym kanale dla danej gminy
   */
  private async sendNtfyMultiChannel(title: string, message: string, payload: NotificationPayload): Promise<void> {
    const isNew = payload.changeType === 'NEW';
    const muniTopic = getMunicipalityTopic(payload.meeting.municipality);
    const muniUrl = `${BASE_NTFY_SERVER}/${muniTopic}`;
    const globalUrl = config.ntfy.topicUrl;

    // Zestaw unikalnych docelowych URLi ntfy
    const targetUrls = new Set<string>([globalUrl]);
    if (muniUrl !== globalUrl) {
      targetUrls.add(muniUrl);
    }

    for (const targetUrl of targetUrls) {
      try {
        const topicName = targetUrl.replace(`${BASE_NTFY_SERVER}/`, '');
        const response = await fetch(BASE_NTFY_SERVER, {
          method: 'POST',
          signal: AbortSignal.timeout(3000), // 3 sekundy timeoutu
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            topic: topicName,
            title,
            message,
            priority: isNew ? 3 : 4,
            tags: isNew ? ['calendar', 'sparkles'] : ['warning', 'bell'],
            click: payload.meeting.url,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`[NotificationService] Limit zapytań ntfy.sh osiągnięty (${targetUrl}) - wstrzymano.`);
            break;
          }
          const errText = await response.text().catch(() => '');
          console.warn(`[NotificationService] ntfy.sh (${targetUrl}) zwrócił kod ${response.status}: ${errText}`);
        } else {
          console.log(`[NotificationService] Pomyślnie wysłano alert ntfy do ${targetUrl}`);
        }
      } catch (err) {
        console.warn(`[NotificationService] Błąd połączenia z ntfy.sh (${targetUrl}): ${(err as Error).message}`);
      }

      // Krótkie opóźnienie, aby uniknąć limitu burst (429) na publicznym serwerze ntfy.sh
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private async sendEmail(subject: string, text: string, payload: NotificationPayload): Promise<void> {
    if (!this.mailTransporter) return;

    const safeSubject = this.escapeHtml(subject);
    const safeMuni = this.escapeHtml(payload.meeting.municipality);
    const safeType = this.escapeHtml(payload.meeting.type);
    const safeTitle = this.escapeHtml(payload.meeting.title);
    const safeDate = this.escapeHtml(payload.meeting.date);
    const safeStatus = this.escapeHtml(payload.meeting.status);
    const safeUrl = this.escapeHtml(payload.meeting.url);
    const safeChanges = payload.changesSummary ? this.escapeHtml(payload.changesSummary) : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.5; color: #333;">
        <h2 style="color: #2b6cb0;">${safeSubject}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr><td style="padding: 6px; font-weight: bold; width: 140px;">Samorząd:</td><td style="padding: 6px;">${safeMuni}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Typ:</td><td style="padding: 6px;">${safeType}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Tytuł:</td><td style="padding: 6px;">${safeTitle}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Termin:</td><td style="padding: 6px;">${safeDate}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Status:</td><td style="padding: 6px;">${safeStatus}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Link:</td><td style="padding: 6px;"><a href="${safeUrl}">Zobacz na stronie</a></td></tr>
        </table>
        ${safeChanges ? `<div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffeeba;"><strong>Zmiany:</strong><pre style="white-space: pre-wrap; margin: 5px 0 0;">${safeChanges}</pre></div>` : ''}
      </div>
    `;


    try {
      await this.mailTransporter.sendMail({
        from: config.smtp.from,
        to: config.smtp.to,
        subject,
        text,
        html,
      });
      console.log(`[NotificationService] Pomyślnie wysłano email do ${config.smtp.to}`);
    } catch (err) {
      console.warn(`[NotificationService] Błąd wysyłania maila: ${(err as Error).message}`);
    }
  }
}
