import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { EventReport } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Use environment variables if set (e.g. on Vercel), fallback to sandbox applet config
const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (firebaseConfig as any).measurementId || ""
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
// Request Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Auth.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Erro de login:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign-Out
export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Get current cached token or refresh if needed (in memory only)
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Set token directly if we need to
export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
};

/**
 * Firestore CRUD helpers
 */

// Subscribe to real-time updates for a user's reports
export const subscribeToReports = (
  userId: string,
  onUpdate: (reports: EventReport[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(
    collection(db, 'reports'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reports: EventReport[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          evento: data.evento,
          data: data.data,
          hora: data.hora,
          local: data.local,
          participantes: data.participantes,
          descricao: data.descricao,
          responsavel: data.responsavel,
          conferidoPor: data.conferidoPor,
          createdAt: data.createdAt,
          userId: data.userId,
        } as EventReport);
      });
      
      // Sort in memory by createdAt descending
      reports.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      onUpdate(reports);
    },
    (error) => {
      console.error('Erro na sincronização em tempo real:', error);
      if (onError) onError(error);
    }
  );
};

// Add or update a report in Firestore
export const saveReportToFirestore = async (report: EventReport, userId: string) => {
  const reportDocRef = doc(db, 'reports', report.id);
  await setDoc(reportDocRef, {
    ...report,
    userId,
  }, { merge: true });
};

// Delete a report from Firestore
export const deleteReportFromFirestore = async (reportId: string) => {
  const reportDocRef = doc(db, 'reports', reportId);
  await deleteDoc(reportDocRef);
};

/**
 * Google Drive: foto do relatório (1 por relatório)
 * A foto fica na mesma pasta do Drive dos PDFs ("Relatório Sgt Armas CMD XXIX - IMC").
 * Salvamos o fileId no documento do Firestore para poder excluir a foto quando o
 * relatório for excluído, sem depender do Storage do Firebase.
 */

// Faz upload de uma foto para o Google Drive e retorna { viewUrl, fileId }.
// viewUrl é usada para exibir a foto no app e no PDF.
// fileId é salvo no Firestore para exclusão futura.
export const uploadPhotoToDrive = async (
  accessToken: string,
  file: File,
  reportId: string
): Promise<{ viewUrl: string; fileId: string }> => {
  const folderId = await getOrCreateFolder(accessToken, 'Relatório Sgt Armas CMD XXIX - IMC');

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `foto_${reportId}.${ext}`;

  const metadata = {
    name: filename,
    mimeType: file.type,
    parents: folderId ? [folderId] : [],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao enviar foto para o Drive: ${errorText}`);
  }

  const result = await response.json();
  const fileId: string = result.id;

  // Torna o arquivo visível publicamente (leitura) para que a tag <img> funcione
  // sem necessidade de autenticação do Google a cada carregamento.
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  // URL direta de visualização — funciona como src de <img> sem auth
  const viewUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;

  return { viewUrl, fileId };
};

// Remove a foto do Google Drive pelo fileId salvo no Firestore.
// Silenciosamente ignora se o arquivo já não existir.
export const deletePhotoFromDrive = async (
  accessToken: string,
  fileId: string
): Promise<void> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    // 204 = sucesso, 404 = já não existe — ambos são aceitáveis
    if (!response.ok && response.status !== 404) {
      throw new Error(`Erro ao remover foto do Drive: ${response.statusText}`);
    }
  } catch {
    // Falha silenciosa: se o Drive estiver offline ou o arquivo já foi removido,
    // não deve impedir a exclusão do relatório no Firestore.
  }
};

/**
 * Google Drive API integration helpers
 */

// Cache da pasta por nome, para evitar buscas repetidas e criação de pastas duplicadas
// quando múltiplos uploads ocorrem em rápida sucessão na mesma sessão.
const folderIdCache = new Map<string, string>();
const folderCreationInFlight = new Map<string, Promise<string | null>>();

// Helper to get or create a folder in Google Drive
async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string | null> {
  // Se já temos o ID em cache nesta sessão, usa direto (evita race condition e chamadas extras)
  const cached = folderIdCache.get(folderName);
  if (cached) return cached;

  // Se já existe uma busca/criação em andamento para essa pasta, espera ela em vez de
  // disparar outra (evita criar duas pastas com o mesmo nome em uploads simultâneos)
  const inFlight = folderCreationInFlight.get(folderName);
  if (inFlight) return inFlight;

  const promise = (async (): Promise<string | null> => {
    try {
      const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar pasta: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        const id = data.files[0].id;
        folderIdCache.set(folderName, id);
        return id;
      }

      // Create the folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(folderMetadata),
      });

      if (!createResponse.ok) {
        throw new Error(`Erro ao criar pasta: ${createResponse.statusText}`);
      }

      const createdFolder = await createResponse.json();
      folderIdCache.set(folderName, createdFolder.id);
      return createdFolder.id;
    } catch (error) {
      console.error('getOrCreateFolder Error:', error);
      return null;
    } finally {
      folderCreationInFlight.delete(folderName);
    }
  })();

  folderCreationInFlight.set(folderName, promise);
  return promise;
}

// Upload PDF blob to Google Drive
export const uploadPdfToDrive = async (
  accessToken: string,
  pdfBlob: Blob,
  filename: string
): Promise<string> => {
  const folderId = await getOrCreateFolder(accessToken, 'Relatório Sgt Armas CMD XXIX - IMC');

  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    parents: folderId ? [folderId] : [],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', pdfBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro no upload para o Google Drive: ${errorText}`);
  }

  const result = await response.json();
  return result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`;
};
