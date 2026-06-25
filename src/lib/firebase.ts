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
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
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

// Sync multiple local reports to Firestore on first sign-in
export const syncLocalReportsToFirestore = async (localReports: EventReport[], userId: string) => {
  for (const report of localReports) {
    // Only upload if it doesn't already have a userId or is identified as local
    await saveReportToFirestore(report, userId);
  }
};

/**
 * Google Drive API integration helpers
 */

// Helper to get or create a folder in Google Drive
async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string | null> {
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
      return data.files[0].id;
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
    return createdFolder.id;
  } catch (error) {
    console.error('getOrCreateFolder Error:', error);
    return null;
  }
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
