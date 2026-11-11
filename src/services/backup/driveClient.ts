/**
 * Client Google Drive (API REST v3) — GERETOU
 * Stocke la sauvegarde dans « appDataFolder » : dossier caché, propre à l'application,
 * invisible dans le Drive de l'utilisateur et inaccessible aux autres applications.
 * Scope OAuth requis : https://www.googleapis.com/auth/drive.appdata
 *
 * Module pur : `fetch` est injectable pour les tests.
 */

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const BACKUP_FILE_NAME = 'geretou-backup.json';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

/** Jeton expiré ou révoqué : il faut se reconnecter à Google. */
export class DriveAuthError extends Error {}
export class DriveError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Fetch = typeof fetch;

export class DriveClient {
  private readonly accessToken: string;
  private readonly fetchImpl: Fetch;

  constructor(accessToken: string, fetchImpl?: Fetch) {
    this.accessToken = accessToken;
    // Le fetch du navigateur doit être appelé sur `window` : le stocker tel quel puis l'appeler
    // via `this.fetchImpl(...)` provoque « Illegal invocation ». On l'enveloppe donc.
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        ...init,
        headers: { Authorization: `Bearer ${this.accessToken}`, ...(init.headers ?? {}) },
      });
    } catch (e) {
      const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.error('[GERETOU] Appel Google Drive impossible', url.split('?')[0], detail);
      const offline = typeof navigator !== 'undefined' && (navigator as { onLine?: boolean }).onLine === false;
      throw new DriveError(
        offline
          ? 'Pas de connexion Internet. Réessayez une fois connecté.'
          : `Impossible de joindre Google Drive (${detail}). Vérifiez qu'aucun bloqueur de publicité ne bloque googleapis.com.`,
        0
      );
    }
    if (res.status === 401) throw new DriveAuthError('Session Google expirée. Reconnectez-vous.');
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new DriveError(`Erreur Google Drive (${res.status}). ${detail.slice(0, 200)}`.trim(), res.status);
    }
    return res;
  }

  /** Cherche la sauvegarde GERETOU ; null si aucune. */
  async findBackup(): Promise<DriveFileInfo | null> {
    const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const res = await this.request(
      `${API}/files?spaces=appDataFolder&q=${q}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,size)`
    );
    const data = (await res.json()) as { files?: DriveFileInfo[] };
    return data.files?.[0] ?? null;
  }

  async download(fileId: string): Promise<string> {
    const res = await this.request(`${API}/files/${encodeURIComponent(fileId)}?alt=media`);
    return res.text();
  }

  /** Crée ou remplace la sauvegarde. Renvoie les métadonnées du fichier enregistré. */
  async upload(content: string): Promise<DriveFileInfo> {
    const existing = await this.findBackup();
    const metadata = existing ? { name: BACKUP_FILE_NAME } : { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] };
    const boundary = `geretou_${Date.now().toString(36)}`;
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n` +
      `--${boundary}--`;

    const url = existing
      ? `${UPLOAD}/files/${encodeURIComponent(existing.id)}?uploadType=multipart&fields=id,name,modifiedTime,size`
      : `${UPLOAD}/files?uploadType=multipart&fields=id,name,modifiedTime,size`;
    const res = await this.request(url, {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    return (await res.json()) as DriveFileInfo;
  }
}
