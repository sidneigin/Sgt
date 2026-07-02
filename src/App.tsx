import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle, 
  LogOut, 
  RefreshCw,
} from 'lucide-react';
import type { EventReport } from './types';
import type { PhotoChange } from './components/ReportForm';
import { validateEventReport } from './utils/validateReport';
import { translateFirebaseError } from './utils/firebaseErrors';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import ReportModal from './components/ReportModal';
import LoginScreen from './components/LoginScreen';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  subscribeToReports, 
  saveReportToFirestore, 
  deleteReportFromFirestore,
  uploadPhotoToDrive,
  deletePhotoFromDrive,
  uploadPdfToDrive,
  setAccessToken,
  getAccessToken
} from './lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import logoImg from './assets/images/sgt_armas_logo_ui.jpg';

export default function App() {
  const [reports, setReports] = useState<EventReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<EventReport | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeViewReport, setActiveViewReport] = useState<EventReport | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Firebase & Google Drive States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<string | null>(null);

  // Load auth state on mount. authChecked marca quando o Firebase já confirmou
  // se existe (ou não) uma sessão ativa, para evitar mostrar a tela de login
  // por um instante antes de saber que o usuário já estava logado.
  useEffect(() => {
    const unsubscribe = initAuth((currentUser, token) => {
      setUser(currentUser);
      setAuthChecked(true);
      if (token) {
        setAccessToken(token);
      }
    }, () => {
      setUser(null);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time reports from Firestore enquanto houver usuário logado.
  // Sem login, não há nenhum dado para carregar — a tela de login bloqueia o acesso.
  useEffect(() => {
    if (!user) {
      setReports([]);
      return;
    }

    setIsSyncing(true);
    const unsubscribeReports = subscribeToReports(
      user.uid,
      (firestoreReports) => {
        setReports(firestoreReports);
        setIsSyncing(false);
      },
      (error: any) => {
        console.error('Erro Firestore:', error);
        triggerAlert(`Erro ao carregar relatórios: ${translateFirebaseError(error)}`, 'error');
        setIsSyncing(false);
      }
    );

    return () => unsubscribeReports();
  }, [user]);

  // Save/trigger alert messages
  const triggerAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlertInfo({ message, type });
    setTimeout(() => setAlertInfo(null), 4000);
  };

  // Google Login and Logout Handlers
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        triggerAlert(`Bem-vindo, ${res.user.displayName}!`);
      }
    } catch (error: any) {
      console.error(error);
      triggerAlert(`Falha ao autenticar com o Google: ${translateFirebaseError(error, 'Tente novamente.')}`, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleSignOut();
      setUser(null);
      triggerAlert('Sessão encerrada com sucesso.');
    } catch (error) {
      console.error(error);
      triggerAlert('Falha ao desconectar.', 'error');
    }
  };

  // Create or Update Report (sempre via Firestore — o app exige login antes de qualquer acesso)
  const handleSaveReport = async (reportData: Omit<EventReport, 'id' | 'createdAt'>, photoChange: PhotoChange) => {
    if (!user) return;

    const validation = validateEventReport(reportData);
    if (!validation.valid) {
      triggerAlert(`Não foi possível salvar: ${validation.errors[0]}`, 'error');
      return;
    }

    try {
      const accessToken = getAccessToken();

      if (editingReport) {
        let fotoUrl = editingReport.fotoUrl;
        let fotoDriveId = editingReport.fotoDriveId;

        if (photoChange.type === 'set') {
          // Remove foto antiga do Drive se existir
          if (fotoDriveId && accessToken) {
            try { await deletePhotoFromDrive(accessToken, fotoDriveId); } catch {}
          }
          if (!accessToken) {
            triggerAlert('Faça login novamente para enviar fotos para o Drive.', 'error');
            return;
          }
          const result = await uploadPhotoToDrive(accessToken, photoChange.file, editingReport.id);
          fotoUrl = result.viewUrl;
          fotoDriveId = result.fileId;

        } else if (photoChange.type === 'remove') {
          if (fotoDriveId && accessToken) {
            try { await deletePhotoFromDrive(accessToken, fotoDriveId); } catch {}
          }
          fotoUrl = undefined;
          fotoDriveId = undefined;
        }

        const updatedReport: EventReport = {
          ...editingReport,
          ...reportData,
          fotoUrl,
          fotoDriveId,
        };
        await saveReportToFirestore(updatedReport, user.uid);
        triggerAlert('Relatório atualizado com sucesso!');
        setEditingReport(null);

      } else {
        const newId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let fotoUrl: string | undefined;
        let fotoDriveId: string | undefined;

        if (photoChange.type === 'set') {
          if (!accessToken) {
            triggerAlert('Faça login novamente para enviar fotos para o Drive.', 'error');
            return;
          }
          const result = await uploadPhotoToDrive(accessToken, photoChange.file, newId);
          fotoUrl = result.viewUrl;
          fotoDriveId = result.fileId;
        }

        const newReport: EventReport = {
          id: newId,
          ...reportData,
          fotoUrl,
          fotoDriveId,
          createdAt: Date.now(),
        };
        await saveReportToFirestore(newReport, user.uid);
        triggerAlert('Relatório cadastrado com sucesso!');
        setSelectedReportId(newReport.id);
      }
    } catch (error: any) {
      console.error(error);
      triggerAlert(`Erro ao salvar o relatório: ${translateFirebaseError(error)}`, 'error');
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      const reportToDelete = reports.find((r) => r.id === id);
      if (reportToDelete?.fotoDriveId) {
        const accessToken = getAccessToken();
        if (accessToken) {
          try { await deletePhotoFromDrive(accessToken, reportToDelete.fotoDriveId); } catch {}
        }
      }

      await deleteReportFromFirestore(id);
      if (selectedReportId === id) setSelectedReportId(null);
      if (editingReport?.id === id) setEditingReport(null);
      triggerAlert('Relatório excluído com sucesso!', 'success');
    } catch (error: any) {
      console.error(error);
      triggerAlert(`Erro ao excluir o relatório: ${translateFirebaseError(error)}`, 'error');
    }
  };

  // Google Drive Saving Handlers
  const handleSaveToDrive = async (report: EventReport) => {
    try {
      const token = getAccessToken();
      if (!token) {
        const loginFirst = window.confirm('O acesso ao Google Drive expirou. Deseja fazer login novamente?');
        if (loginFirst) {
          await handleLogin();
        }
        return;
      }

      setIsUploadingToDrive(report.id);
      triggerAlert('Sincronizando PDF com o Google Drive...');

      // Generate the PDF document
      const { generateSingleReportPDF } = await import('./utils/pdfGenerator');
      const doc = await generateSingleReportPDF(report);
      const blob = doc.output('blob');
      const filename = `relatorio_${report.evento.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${report.data}.pdf`;

      const fileUrl = await uploadPdfToDrive(token, blob, filename);
      
      triggerAlert('Relatório enviado para o Google Drive com sucesso!');
      
      // Delay prompt slightly so alert is readable
      setTimeout(() => {
        const openConfirm = window.confirm('O relatório foi salvo na pasta "Relatório Sgt Armas CMD XXIX - IMC". Deseja abri-lo agora no Google Drive?');
        if (openConfirm) {
          window.open(fileUrl, '_blank');
        }
      }, 500);
    } catch (error: any) {
      console.error(error);
      triggerAlert(`Falha ao exportar para o Google Drive: ${translateFirebaseError(error, 'Tente novamente.')}`, 'error');
    } finally {
      setIsUploadingToDrive(null);
    }
  };

  const handleSaveConsolidatedToDrive = async (filteredReports: EventReport[]) => {
    try {
      const token = getAccessToken();
      if (!token) {
        const loginFirst = window.confirm('O acesso ao Google Drive expirou. Deseja fazer login novamente?');
        if (loginFirst) {
          await handleLogin();
        }
        return;
      }

      setIsUploadingToDrive('consolidated');
      triggerAlert('Enviando tabela consolidada para o Google Drive...');

      // Generate Consolidated PDF
      const { generateConsolidatedReportsPDF } = await import('./utils/pdfGenerator');
      const doc = await generateConsolidatedReportsPDF(filteredReports);
      const blob = doc.output('blob');
      const filename = `consolidado_relatorios_${new Date().toISOString().split('T')[0]}.pdf`;

      const fileUrl = await uploadPdfToDrive(token, blob, filename);
      
      triggerAlert('Tabela consolidada salva no Google Drive com sucesso!');

      setTimeout(() => {
        const openConfirm = window.confirm('A tabela consolidada foi salva na pasta "Relatório Sgt Armas CMD XXIX - IMC". Deseja abri-la agora no Google Drive?');
        if (openConfirm) {
          window.open(fileUrl, '_blank');
        }
      }, 500);
    } catch (error: any) {
      console.error(error);
      triggerAlert(`Falha ao exportar tabela consolidada: ${translateFirebaseError(error, 'Tente novamente.')}`, 'error');
    } finally {
      setIsUploadingToDrive(null);
    }
  };

  // Selection handlers
  const handleSelectReport = (id: string) => {
    setSelectedReportId(id);
  };

  const handleDoubleSelectReport = (report: EventReport) => {
    setSelectedReportId(report.id);
    setActiveViewReport(report);
    setIsViewModalOpen(true);
  };

  const handleViewReport = (report: EventReport) => {
    setActiveViewReport(report);
    setIsViewModalOpen(true);
  };

  const handleLoadEditReport = (report: EventReport) => {
    setEditingReport(report);
    // Scroll to form on mobile devices
    const formElement = document.getElementById('input-evento');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
  };

  // Enquanto o Firebase ainda não confirmou se há uma sessão ativa, mostra um
  // estado neutro de carregamento — evita um "flash" da tela de login antes
  // de saber que o usuário já estava autenticado.
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  // Sem usuário autenticado, nenhuma parte do app (formulário, lista, dados) é exibida.
  if (!user) {
    return <LoginScreen onLogin={handleLogin} isLoggingIn={isLoggingIn} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Header Navigation */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
              <img 
                src={logoImg} 
                alt="Insanos MC Logo" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-bold tracking-tight font-sans">
                Relatório Sgt Armas CMD XXIX - IMC
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase hidden sm:block">
                Santinão Cmd Armas IV
              </p>
            </div>
          </div>

          {/* Auth & Sync Status */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2">
              <span className="hidden lg:flex items-center gap-1.5 text-[11px] bg-emerald-950/40 text-emerald-300 py-1.5 px-3 rounded-lg border border-emerald-500/30">
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {isSyncing ? 'Sincronizando...' : 'Nuvem Sincronizada'}
              </span>
              
              {/* User Info Avatar & Sign Out */}
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/60 rounded-xl p-1 pr-3">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Usuário'} 
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-xs text-slate-200 font-medium hidden md:inline max-w-[120px] truncate">
                  {user.displayName?.split(' ')[0]}
                </span>
                <button
                  id="btn-google-signout"
                  onClick={handleLogout}
                  className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Sair da Conta Google"
                  aria-label="Sair da conta Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:grid md:grid-cols-12 gap-6 min-h-0">
        
        {/* Floating Global Notification Alert */}
        {alertInfo && (
          <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 max-w-md animate-bounce ${
            alertInfo.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            {alertInfo.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <p className="text-xs font-medium font-sans leading-tight">{alertInfo.message}</p>
          </div>
        )}

        {/* Informative Instructions Bar for Quick Use */}
        <div className="col-span-12 bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">Como usar o gerenciador:</p>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Cadastre um evento à esquerda e clique em <strong>Salvar</strong>. Use a lista para <strong>Buscar</strong> por palavra-chave, <strong>Visualizar</strong> em tela cheia com duplo clique, <strong>Editar</strong> ou exportar em <strong>PDF individual</strong> ou <strong>PDF Consolidado</strong> / <strong>Sid Armas Umuarama Oeste</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Left Side: Form Panel */}
        <section className="col-span-12 md:col-span-5 md:h-[calc(100vh-190px)] md:min-h-[500px]">
          <ReportForm
            editingReport={editingReport}
            onSave={handleSaveReport}
            onCancelEdit={handleCancelEdit}
          />
        </section>

        {/* Right Side: List and Search Panel */}
        <section className="col-span-12 md:col-span-7 md:h-[calc(100vh-190px)] md:min-h-[500px]">
          <ReportList
            reports={reports}
            selectedReportId={selectedReportId}
            onSelectReport={handleSelectReport}
            onDoubleSelectReport={handleDoubleSelectReport}
            onViewReport={handleViewReport}
            onLoadEditReport={handleLoadEditReport}
            onDeleteReport={handleDeleteReport}
            onGenerateSinglePDF={(report) => import('./utils/pdfGenerator').then(({ generateSingleReportPDF }) => generateSingleReportPDF(report))}
            onGenerateConsolidatedPDF={(filteredReports) => import('./utils/pdfGenerator').then(({ generateConsolidatedReportsPDF }) => generateConsolidatedReportsPDF(filteredReports))}
            user={user}
            onSaveToDrive={handleSaveToDrive}
            onSaveConsolidatedToDrive={handleSaveConsolidatedToDrive}
            isUploadingToDrive={isUploadingToDrive}
          />
        </section>
      </main>

      {/* View Modal Overlay */}
      <ReportModal
        report={activeViewReport}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setActiveViewReport(null);
        }}
        user={user}
        onSaveToDrive={handleSaveToDrive}
        isUploadingToDrive={isUploadingToDrive}
      />

      {/* Flat simple footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-slate-500 text-[11px] font-mono">
        Relatório Sgt Armas CMD XXIX - IMC © 2026 • Sid Sgt Armas
      </footer>
    </div>
  );
}
