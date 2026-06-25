import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  LogIn, 
  LogOut, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { EventReport } from './types';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import ReportModal from './components/ReportModal';
import { generateSingleReportPDF, generateConsolidatedReportsPDF } from './utils/pdfGenerator';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  subscribeToReports, 
  saveReportToFirestore, 
  deleteReportFromFirestore, 
  syncLocalReportsToFirestore,
  uploadPdfToDrive,
  setAccessToken,
  getAccessToken
} from './lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import logoImg from './assets/images/insanos_sgt_de_armas_logo_1782309633861.jpg';

const MOCK_REPORTS: EventReport[] = [
  {
    id: 'mock-1',
    evento: 'Inauguração da Nova Sede',
    data: '2026-06-15',
    hora: '14:00',
    local: 'Escritório Central - Bloco B',
    responsavel: 'Sidnei Bogas',
    conferidoPor: 'Tenente Silva',
    participantes: 'Sidnei Bogas, Diretoria Executiva, Equipe de Engenharia, Equipe de Facilities, Clientes Parceiros.',
    descricao: 'Evento oficial de inauguração do novo andar corporativo. Realizamos o corte da fita inaugural liderado pelo CEO. Em seguida, foi feito um tour guiado pelas novas salas de reunião, espaço de convivência e estações de trabalho colaborativas. O evento foi encerrado com um coquetel comemorativo para cerca de 80 convidados. Todos elogiaram a nova estrutura física e tecnológica.',
    createdAt: Date.now() - 3600000 * 24 * 5
  },
  {
    id: 'mock-2',
    evento: 'Treinamento de Segurança da Informação',
    data: '2026-06-20',
    hora: '09:30',
    local: 'Sala de Treinamentos Principal e Online',
    responsavel: 'Mariana Souza (Segurança Corporativa)',
    conferidoPor: 'Capitão Oliveira',
    participantes: 'Todo o time de desenvolvimento de software, gerentes de projetos e especialistas de TI.',
    descricao: 'Workshop prático sobre boas práticas de OWASP Top 10, proteção de dados e manuseio seguro de chaves de API. Demonstramos casos reais de ataques de engenharia social e vazamento de credenciais em repositórios públicos. Ao final, aplicamos um quiz interativo para fixação do conteúdo. A taxa de acertos no quiz foi superior a 85%, cumprindo a meta estabelecida para o trimestre.',
    createdAt: Date.now() - 3600000 * 24 * 2
  },
  {
    id: 'mock-3',
    evento: 'Workshop de Planejamento Trimestral (Q3)',
    data: '2026-06-23',
    hora: '10:00',
    local: 'Sala de Ideação e Design Thinking',
    responsavel: 'Carlos Eduardo (Product Manager)',
    conferidoPor: 'Major Santos',
    participantes: 'Equipe de Produto, Engenharia de Software, Marketing e Sucesso do Cliente.',
    descricao: 'Reunião estratégica para definição de OKRs e priorização do backlog de desenvolvimento do Q3. Mapeamos os principais gargalos enfrentados no Q2 e traçamos planos de mitigação. A equipe trabalhou de forma colaborativa usando quadros visuais para votar nos recursos com maior valor para os clientes finais. O roadmap final foi consolidado e compartilhado com as partes interessadas.',
    createdAt: Date.now() - 3600000 * 5
  }
];

export default function App() {
  const [reports, setReports] = useState<EventReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<EventReport | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeViewReport, setActiveViewReport] = useState<EventReport | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Firebase & Google Drive States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<string | null>(null);

  // Load auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth((currentUser, token) => {
      setUser(currentUser);
      if (token) {
        setAccessToken(token);
      }
    }, () => {
      setUser(null);
    });
    return () => unsubscribe();
  }, []);

  // Sync / load reports based on auth state
  useEffect(() => {
    if (user) {
      setIsSyncing(true);
      // Synchronize existing local reports to firestore if they aren't synced yet
      const stored = localStorage.getItem('event_reports');
      if (stored) {
        try {
          const localReports: EventReport[] = JSON.parse(stored);
          if (localReports.length > 0) {
            syncLocalReportsToFirestore(localReports, user.uid)
              .then(() => {
                // Clear local storage to avoid endless syncing
                localStorage.removeItem('event_reports');
                triggerAlert('Relatórios locais sincronizados com o Firestore!');
              })
              .catch((err) => console.error('Erro na sincronização inicial:', err));
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Subscribe to real-time reports from Firestore
      const unsubscribeReports = subscribeToReports(
        user.uid,
        (firestoreReports) => {
          setReports(firestoreReports);
          setIsSyncing(false);
        },
        (error: any) => {
          console.error('Erro Firestore:', error);
          const errorMessage = error?.message || 'Erro desconhecido.';
          const errorCode = error?.code ? ` (${error.code})` : '';
          triggerAlert(`Erro ao carregar relatórios do Firestore: ${errorMessage}${errorCode}`, 'error');
          setIsSyncing(false);
        }
      );

      return () => unsubscribeReports();
    } else {
      // Load from LocalStorage if not logged in
      const stored = localStorage.getItem('event_reports');
      if (stored) {
        try {
          setReports(JSON.parse(stored));
        } catch (e) {
          setReports(MOCK_REPORTS);
          localStorage.setItem('event_reports', JSON.stringify(MOCK_REPORTS));
        }
      } else {
        setReports(MOCK_REPORTS);
        localStorage.setItem('event_reports', JSON.stringify(MOCK_REPORTS));
      }
    }
  }, [user]);

  // Save/trigger alert messages
  const triggerAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlertInfo({ message, type });
    setTimeout(() => setAlertInfo(null), 4000);
  };

  // Google Login and Logout Handlers
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        triggerAlert(`Bem-vindo, ${res.user.displayName}! Sincronizando relatórios...`);
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || 'Falha ao autenticar com o Google.';
      const errorCode = error?.code ? ` (${error.code})` : '';
      triggerAlert(`Falha ao autenticar com o Google: ${errorMessage}${errorCode}`, 'error');
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

  // Create or Update Report (supports both LocalStorage and Firestore)
  const handleSaveReport = async (reportData: Omit<EventReport, 'id' | 'createdAt'>) => {
    try {
      if (editingReport) {
        // Update existing
        const updatedReport: EventReport = {
          ...editingReport,
          ...reportData,
        };

        if (user) {
          await saveReportToFirestore(updatedReport, user.uid);
        } else {
          const updatedReports = reports.map((r) =>
            r.id === editingReport.id ? updatedReport : r
          );
          setReports(updatedReports);
          localStorage.setItem('event_reports', JSON.stringify(updatedReports));
        }
        triggerAlert('Relatório atualizado com sucesso!');
        setEditingReport(null);
      } else {
        // Create new
        const newReport: EventReport = {
          id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...reportData,
          createdAt: Date.now()
        };

        if (user) {
          await saveReportToFirestore(newReport, user.uid);
        } else {
          const updatedReports = [newReport, ...reports];
          setReports(updatedReports);
          localStorage.setItem('event_reports', JSON.stringify(updatedReports));
        }
        triggerAlert('Relatório cadastrado com sucesso!');
        setSelectedReportId(newReport.id);
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || 'Erro desconhecido.';
      triggerAlert(`Erro ao salvar o relatório: ${errorMessage}`, 'error');
    }
  };

  // Delete Report (supports both LocalStorage and Firestore)
  const handleDeleteReport = async (id: string) => {
    try {
      if (user) {
        await deleteReportFromFirestore(id);
      } else {
        const updatedReports = reports.filter((r) => r.id !== id);
        setReports(updatedReports);
        localStorage.setItem('event_reports', JSON.stringify(updatedReports));
      }

      if (selectedReportId === id) {
        setSelectedReportId(null);
      }
      if (editingReport?.id === id) {
        setEditingReport(null);
      }
      triggerAlert('Relatório excluído com sucesso!', 'success');
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || 'Erro desconhecido.';
      triggerAlert(`Erro ao excluir o relatório: ${errorMessage}`, 'error');
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
    } catch (error) {
      console.error(error);
      triggerAlert('Falha ao exportar para o Google Drive.', 'error');
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
    } catch (error) {
      console.error(error);
      triggerAlert('Falha ao exportar tabela consolidada para o Google Drive.', 'error');
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

          {/* Auth & Backup Action buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {user ? (
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
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="btn-google-signin"
                onClick={handleLogin}
                className="flex items-center gap-2 text-xs font-semibold py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-900/10 transition-all cursor-pointer"
                title="Fazer login com Google para habilitar sincronização em tempo real e exportação para o Google Drive"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar com Google</span>
              </button>
            )}
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
        <section className="col-span-12 md:col-span-5 h-[calc(100vh-190px)] min-h-[500px] md:h-[calc(100vh-190px)]">
          <ReportForm
            editingReport={editingReport}
            onSave={handleSaveReport}
            onCancelEdit={handleCancelEdit}
          />
        </section>

        {/* Right Side: List and Search Panel */}
        <section className="col-span-12 md:col-span-7 h-[calc(100vh-190px)] min-h-[500px] md:h-[calc(100vh-190px)]">
          <ReportList
            reports={reports}
            selectedReportId={selectedReportId}
            onSelectReport={handleSelectReport}
            onDoubleSelectReport={handleDoubleSelectReport}
            onViewReport={handleViewReport}
            onLoadEditReport={handleLoadEditReport}
            onDeleteReport={handleDeleteReport}
            onGenerateSinglePDF={generateSingleReportPDF}
            onGenerateConsolidatedPDF={generateConsolidatedReportsPDF}
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
