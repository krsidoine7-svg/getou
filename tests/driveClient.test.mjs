/**
 * Tests du client Google Drive — GERETOU
 * Un faux « Google Drive » en mémoire remplace le réseau.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DriveClient, DriveAuthError, DriveError, BACKUP_FILE_NAME } from '../src/services/backup/driveClient.ts';

/** Faux Drive : appDataFolder en mémoire, jeton valide = 'ok'. */
function fakeDrive() {
  const files = new Map();
  let seq = 0;
  const calls = [];
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  const impl = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method ?? 'GET';
    calls.push(`${method} ${u.pathname}`);
    if (init.headers?.Authorization !== 'Bearer ok') return new Response('unauthorized', { status: 401 });

    if (method === 'GET' && u.pathname === '/drive/v3/files') {
      assert.equal(u.searchParams.get('spaces'), 'appDataFolder');
      return json({ files: [...files.values()].map(({ content, ...meta }) => meta) });
    }
    const m = u.pathname.match(/\/files\/([^/]+)$/);
    if (method === 'GET' && m) return new Response(files.get(m[1]).content);

    if (method === 'POST' || method === 'PATCH') {
      const parts = init.body.split(/--geretou_[a-z0-9]+/).filter((p) => p.includes('\r\n\r\n'));
      const meta = JSON.parse(parts[0].split('\r\n\r\n')[1]);
      const content = parts[1].split('\r\n\r\n')[1].replace(/\r\n$/, '');
      const id = method === 'POST' ? `f${++seq}` : m[1];
      if (method === 'POST') assert.deepEqual(meta.parents, ['appDataFolder']);
      const file = { id, name: meta.name, modifiedTime: new Date().toISOString(), size: String(content.length), content };
      files.set(id, file);
      const { content: _c, ...out } = file;
      return json(out);
    }
    return new Response('not found', { status: 404 });
  };
  return { impl, files, calls };
}

test('aucune sauvegarde au départ', async () => {
  const drive = fakeDrive();
  assert.equal(await new DriveClient('ok', drive.impl).findBackup(), null);
});

test("envoi, relecture, puis remplacement du même fichier (pas d'accumulation)", async () => {
  const drive = fakeDrive();
  const client = new DriveClient('ok', drive.impl);

  const first = await client.upload('{"v":1}');
  assert.equal(first.name, BACKUP_FILE_NAME);
  assert.equal(await client.download(first.id), '{"v":1}');

  const second = await client.upload('{"v":2,"note":"Marché d\'Adjamé"}');
  assert.equal(second.id, first.id, 'le fichier existant est mis à jour');
  assert.equal(drive.files.size, 1);
  assert.equal(await client.download((await client.findBackup()).id), '{"v":2,"note":"Marché d\'Adjamé"}');
  assert.ok(drive.calls.includes(`PATCH /upload/drive/v3/files/${first.id}`));
});

test('jeton expiré → DriveAuthError (il faut se reconnecter)', async () => {
  const drive = fakeDrive();
  await assert.rejects(new DriveClient('expiré', drive.impl).findBackup(), DriveAuthError);
});

test('appel bloqué → message avec la vraie cause', async (t) => {
  t.mock.method(console, 'error', () => {});
  const blocked = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    new DriveClient('ok', blocked).findBackup(),
    (e) => e instanceof DriveError && /Impossible de joindre Google Drive/.test(e.message) && /Failed to fetch/.test(e.message)
  );
});

test('navigateur hors ligne → « Pas de connexion Internet »', async (t) => {
  t.mock.method(console, 'error', () => {});
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
  try {
    const offline = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(new DriveClient('ok', offline).findBackup(), (e) => e instanceof DriveError && /Pas de connexion Internet/.test(e.message));
  } finally {
    if (desc) Object.defineProperty(globalThis, 'navigator', desc); else delete globalThis.navigator;
  }
});

test('erreur serveur → DriveError avec le code', async () => {
  const broken = async () => new Response('quota', { status: 403 });
  await assert.rejects(new DriveClient('ok', broken).upload('{}'), (e) => e instanceof DriveError && e.status === 403);
});

test('le fetch global est appelé sans changer de contexte (« Illegal invocation » des navigateurs)', async () => {
  const realFetch = globalThis.fetch;
  // Imite le fetch du navigateur : refuse d'être appelé avec un `this` autre que globalThis/undefined.
  globalThis.fetch = function (url, init) {
    if (this !== undefined && this !== globalThis) throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
    return Promise.resolve(new Response(JSON.stringify({ files: [] }), { status: 200 }));
  };
  try {
    assert.equal(await new DriveClient('ok').findBackup(), null);
  } finally {
    globalThis.fetch = realFetch;
  }
});
