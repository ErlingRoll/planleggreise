export function getErrorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Noe gikk galt'
}
