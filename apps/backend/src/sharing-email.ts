export type SharingEmail = {
  to: string
  subject: string
  actionUrl: string
  actionLabel: string
}

export interface SharingEmailSender {
  send(email: SharingEmail): Promise<void>
}

export function createSharingEmailSender(
  environment: NodeJS.ProcessEnv = process.env,
): SharingEmailSender {
  const functionUrl = environment.SHARING_EMAIL_FUNCTION_URL
  const functionSecret = environment.SHARING_EMAIL_FUNCTION_SECRET

  return {
    async send(email) {
      if (!functionUrl || !functionSecret) {
        console.warn(
          'Sharing email notifications are not configured; the sharing change was saved without sending email.',
        )
        return
      }

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${functionSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(email),
      })

      if (!response.ok) {
        throw new Error(
          `Sharing email notification failed (${response.status})`,
        )
      }
    },
  }
}
