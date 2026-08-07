import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  approveTripAccessRequest,
  createTripAccessLink,
  createTripInvitation,
  denyTripAccessRequest,
  getTripSharing,
  removeTripMember,
  revokeTripAccessLink,
  revokeTripInvitation,
  type TripDetail,
  type TripSharing,
} from '../../api'
import { getErrorMessage } from '../../lib/errors'

type TripSharingSettingsProps = {
  accessToken: string
  onCanManageChange?: (canManage: boolean) => void
  trip: TripDetail
}

export function TripSharingSettings({
  accessToken,
  onCanManageChange,
  trip,
}: TripSharingSettingsProps) {
  const { t } = useTranslation()
  const [sharing, setSharing] = useState<TripSharing | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    getTripSharing(accessToken, trip.id)
      .then((nextSharing) => {
        if (isMounted) {
          setSharing(nextSharing)
          onCanManageChange?.(nextSharing.canManage)
        }
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          onCanManageChange?.(false)
          setError(getErrorMessage(reason))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [accessToken, onCanManageChange, trip.id])

  if (isLoading) {
    return (
      <section className="mt-5 border-t border-border-card pt-5">
        <p className="text-sm text-muted">{t('tripSettings.sharingLoading')}</p>
      </section>
    )
  }

  if (!sharing || !sharing.canManage) {
    return null
  }

  async function handleInvite() {
    setIsSaving(true)
    setError(null)
    try {
      const invitation = await createTripInvitation(accessToken, trip.id, { email })
      setSharing((current) =>
        current
          ? { ...current, invitations: [invitation, ...current.invitations] }
          : current,
      )
      setEmail('')
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateLink() {
    setIsSaving(true)
    setError(null)
    try {
      const link = await createTripAccessLink(accessToken, trip.id)
      setSharing((current) =>
        current
          ? { ...current, accessLinks: [link, ...current.accessLinks] }
          : current,
      )
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleApprove(requestId: string) {
    setIsSaving(true)
    setError(null)
    try {
      const member = await approveTripAccessRequest(
        accessToken,
        trip.id,
        requestId,
      )
      setSharing((current) =>
        current
          ? {
              ...current,
              members: [...current.members, member],
              requests: current.requests.map((request) =>
                request.id === requestId
                  ? { ...request, status: 'approved' as const }
                  : request,
              ),
            }
          : current,
      )
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeny(requestId: string) {
    setIsSaving(true)
    setError(null)
    try {
      const accessRequest = await denyTripAccessRequest(
        accessToken,
        trip.id,
        requestId,
      )
      setSharing((current) =>
        current
          ? {
              ...current,
              requests: current.requests.map((request) =>
                request.id === requestId ? accessRequest : request,
              ),
            }
          : current,
      )
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    setIsSaving(true)
    setError(null)
    try {
      await removeTripMember(accessToken, trip.id, userId)
      setSharing((current) =>
        current
          ? {
              ...current,
              members: current.members.filter((member) => member.userId !== userId),
            }
          : current,
      )
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    setIsSaving(true)
    setError(null)
    try {
      const invitation = await revokeTripInvitation(
        accessToken,
        trip.id,
        invitationId,
      )
      setSharing((current) =>
        current
          ? {
              ...current,
              invitations: current.invitations.map((item) =>
                item.id === invitationId ? invitation : item,
              ),
            }
          : current,
      )
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRevokeLink(linkId: string) {
    setIsSaving(true)
    setError(null)
    try {
      const link = await revokeTripAccessLink(accessToken, trip.id, linkId)
      setSharing((current) =>
        current
          ? {
              ...current,
              accessLinks: current.accessLinks.map((item) =>
                item.id === linkId ? link : item,
              ),
            }
          : current,
      )
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCopyLink(linkId: string, token: string) {
    const url = `${window.location.origin}/trips/${trip.id}/request-access?token=${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLinkId(linkId)
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    }
  }

  const pendingRequests = sharing.requests.filter(
    (request) => request.status === 'pending',
  )
  const activeLinks = sharing.accessLinks.filter((link) => !link.revokedAt)
  const pendingInvitations = sharing.invitations.filter(
    (invitation) => invitation.status === 'pending',
  )

  return (
    <section className="mt-5 border-t border-border-card pt-5">
      <h4 className="font-semibold text-brand">{t('tripSettings.sharingTitle')}</h4>
      <p className="mt-1 text-sm text-muted">
        {t('tripSettings.sharingDescription')}
      </p>

      <div className="mt-4 grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('tripSettings.sharingEmailPlaceholder')}
            type="email"
            value={email}
          />
          <button
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand disabled:opacity-60"
            disabled={isSaving || !email.trim()}
            onClick={() => void handleInvite()}
            type="button"
          >
            {t('tripSettings.invite')}
          </button>
        </div>
        <button
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-brand disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void handleCreateLink()}
          type="button"
        >
          {t('tripSettings.createAccessLink')}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      {pendingRequests.length > 0 && (
        <div className="mt-5 grid gap-2">
          <h5 className="text-sm font-semibold text-muted">
            {t('tripSettings.pendingRequests')}
          </h5>
          {pendingRequests.map((request) => (
            <div
              className="flex flex-col gap-2 rounded-xl bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              key={request.id}
            >
              <span className="text-sm text-ink">{request.email}</span>
              <div className="flex gap-2">
                <button
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-brand disabled:opacity-60"
                  disabled={isSaving}
                  onClick={() => void handleApprove(request.id)}
                  type="button"
                >
                  {t('tripSettings.approve')}
                </button>
                <button
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-error hover:bg-danger-surface disabled:opacity-60"
                  disabled={isSaving}
                  onClick={() => void handleDeny(request.id)}
                  type="button"
                >
                  {t('tripSettings.deny')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-2">
        <h5 className="text-sm font-semibold text-muted">
          {t('tripSettings.members')}
        </h5>
        {sharing.members.map((member) => (
          <div
            className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3"
            key={member.userId}
          >
            <span className="min-w-0 truncate text-sm text-ink">
              {member.email ?? member.userId}
            </span>
            {member.role === 'member' && (
              <button
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-error hover:bg-danger-surface disabled:opacity-60"
                disabled={isSaving}
                onClick={() => void handleRemoveMember(member.userId)}
                type="button"
              >
                {t('tripSettings.remove')}
              </button>
            )}
          </div>
        ))}
      </div>

      {pendingInvitations.length > 0 && (
        <div className="mt-5 grid gap-2">
          <h5 className="text-sm font-semibold text-muted">
            {t('tripSettings.pendingInvitations')}
          </h5>
          {pendingInvitations.map((invitation) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3"
              key={invitation.id}
            >
              <span className="min-w-0 truncate text-sm text-ink">
                {invitation.email}
              </span>
              <button
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-error hover:bg-danger-surface disabled:opacity-60"
                disabled={isSaving}
                onClick={() => void handleRevokeInvitation(invitation.id)}
                type="button"
              >
                {t('tripSettings.revoke')}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeLinks.length > 0 && (
        <div className="mt-5 grid gap-2">
          <h5 className="text-sm font-semibold text-muted">
            {t('tripSettings.accessLinks')}
          </h5>
          {activeLinks.map((link) => (
            <div
              className="flex flex-col gap-2 rounded-xl bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              key={link.id}
            >
              <code className="min-w-0 truncate text-xs text-muted">
                {`${window.location.origin}/trips/${trip.id}/request-access?token=${link.token}`}
              </code>
              <div className="flex shrink-0 gap-2">
                <button
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-surface-muted disabled:opacity-60"
                  onClick={() => void handleCopyLink(link.id, link.token)}
                  type="button"
                >
                  {copiedLinkId === link.id
                    ? t('tripSettings.copied')
                    : t('tripSettings.copy')}
                </button>
                <button
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-error hover:bg-danger-surface disabled:opacity-60"
                  disabled={isSaving}
                  onClick={() => void handleRevokeLink(link.id)}
                  type="button"
                >
                  {t('tripSettings.revoke')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
