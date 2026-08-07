type SharingEmail = {
  to: string
  subject: string
  actionUrl: string
  actionLabel: string
}

const resendApiKey = Deno.env.get('RESEND_API_KEY')
// Temporary test sender; replace with the verified production domain before launch.
const sender = Deno.env.get('SHARING_EMAIL_FROM')
const functionSecret = Deno.env.get('SHARING_EMAIL_FUNCTION_SECRET')

Deno.serve(async (request) => {
  if (
    request.headers.get('authorization') !== `Bearer ${functionSecret}` ||
    !functionSecret
  ) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!resendApiKey || !sender) {
    return Response.json(
      { message: 'Email delivery is not configured' },
      { status: 503 },
    )
  }

  const email = (await request.json()) as SharingEmail
  if (
    !email.to ||
    !email.subject ||
    !email.actionUrl ||
    !email.actionLabel
  ) {
    return Response.json({ message: 'Invalid email data' }, { status: 400 })
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender,
      to: [email.to],
      subject: email.subject,
      html: `<p>${email.subject}</p><p><a href="${email.actionUrl}">${email.actionLabel}</a></p>`,
    }),
  })

  if (!response.ok) {
    return Response.json(
      { message: 'Resend rejected the email' },
      { status: 502 },
    )
  }

  return Response.json({ sent: true })
})
