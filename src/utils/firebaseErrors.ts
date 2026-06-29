// Traduz códigos de erro comuns do Firebase/Firestore para mensagens claras em português,
// evitando expor mensagens técnicas (em inglês, com jargão de SDK) diretamente ao usuário final.
export function translateFirebaseError(error: any, fallback = 'Erro desconhecido.'): string {
  const code: string | undefined = error?.code;

  switch (code) {
    case 'permission-denied':
      return 'Você não tem permissão para esta ação. O relatório pode pertencer a outro usuário ou sua sessão pode ter expirado.';
    case 'unavailable':
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    case 'unauthenticated':
      return 'Sua sessão expirou. Faça login novamente.';
    case 'not-found':
      return 'Este relatório não foi encontrado. Ele pode já ter sido excluído.';
    case 'resource-exhausted':
      return 'Limite de uso do servidor atingido. Tente novamente em alguns instantes.';
    case 'deadline-exceeded':
      return 'A operação demorou demais para responder. Tente novamente.';
    case 'auth/popup-closed-by-user':
      return 'O login foi cancelado antes de ser concluído.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de conexão durante o login. Verifique sua internet.';
    default:
      return error?.message || fallback;
  }
}
