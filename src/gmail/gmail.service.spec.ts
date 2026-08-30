import type { gmail_v1 } from 'googleapis';
import { cleanEmailBody, extractPlainText } from './gmail.service';

const b64 = (s: string): string =>
  Buffer.from(s, 'utf-8').toString('base64url');

describe('extractPlainText', () => {
  it('privilégie le text/plain sur le text/html', () => {
    const part = {
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/plain', body: { data: b64('Version texte brut.') } },
        {
          mimeType: 'text/html',
          body: { data: b64('<p>Version <b>HTML</b>.</p>') },
        },
      ],
    } as gmail_v1.Schema$MessagePart;

    expect(extractPlainText(part)).toBe('Version texte brut.');
  });

  it('retombe sur le HTML nettoyé si aucun text/plain', () => {
    const part = {
      mimeType: 'text/html',
      body: { data: b64('<div>Bonjour<br><b>Acme</b></div>') },
    } as gmail_v1.Schema$MessagePart;

    expect(extractPlainText(part)).toBe('Bonjour Acme');
  });
});

describe('cleanEmailBody', () => {
  it('renvoie une chaîne vide pour une entrée vide', () => {
    expect(cleanEmailBody('')).toBe('');
  });

  it('coupe au thread cité Gmail FR', () => {
    const raw =
      'Merci pour votre candidature.\n' +
      'Le 3 mars 2026 à 09:12, RH <rh@x.fr> a écrit :\n' +
      '> ancien message\n> encore du texte';
    expect(cleanEmailBody(raw)).toBe('Merci pour votre candidature.');
  });

  it('coupe au délimiteur de signature', () => {
    const raw = 'Bonjour, bien reçu.\n-- \nJean Dupont\nRH Acme';
    expect(cleanEmailBody(raw)).toBe('Bonjour, bien reçu.');
  });

  it("coupe à l'en-tête de transfert Outlook", () => {
    const raw =
      'Le poste est toujours ouvert.\n' +
      'De : Sophie Martin\nEnvoyé : lundi 3 mars 2026\nÀ : Maxime';
    expect(cleanEmailBody(raw)).toBe('Le poste est toujours ouvert.');
  });

  it('tronque à 1500 caractères avec ellipse', () => {
    const result = cleanEmailBody('a'.repeat(2000));
    expect(result).toHaveLength(1501);
    expect(result.endsWith('…')).toBe(true);
  });

  it('réduit les espaces et lignes vides multiples', () => {
    expect(cleanEmailBody('a\t\t  b\n\n\n\nc')).toBe('a b\n\nc');
  });
});
