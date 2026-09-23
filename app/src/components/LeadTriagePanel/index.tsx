'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

import {
  SALES_NOTE_MAX_LENGTH,
  salesStatusOptions,
  type SalesStatus,
} from '@/lead-capture/triage'
import { formatAdminDate } from '@/utilities/formatAdminDate'

import './index.scss'

type Assignee = {
  id: number | string
  name?: string | null
  role?: string | null
}

type TriageResponse = {
  assignedTo: number | string | null
  assignees: Assignee[]
  canUpdate: boolean
  salesNote: string | null
  salesStatus: SalesStatus | null
  salesUpdatedAt: string | null
  salesUpdatedBy: number | string | null
  version: number
}

const documentID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? id : undefined
  }
  return undefined
}

const assigneeLabel = (assignee: Assignee) =>
  `${assignee.name || `Người dùng ${assignee.id}`} (${assignee.role || 'không rõ vai trò'})`

export default function LeadTriagePanel() {
  const { data } = useDocumentInfo()
  const id = documentID((data as { id?: unknown } | undefined)?.id)
  const [record, setRecord] = useState<TriageResponse | null>(null)
  const [status, setStatus] = useState<SalesStatus | ''>('')
  const [assignedTo, setAssignedTo] = useState('')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (id === undefined) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/form-submissions/${id}/triage`, {
        credentials: 'include',
      })
      const body = (await response.json().catch(() => null)) as
        | (TriageResponse & { message?: string })
        | null

      if (!response.ok || !body) {
        throw new Error(body?.message || 'Không tải được thông tin xử lý lead.')
      }

      setRecord(body)
      setStatus(body.salesStatus || '')
      setAssignedTo(body.assignedTo === null ? '' : String(body.assignedTo))
      setNote(body.salesNote || '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được thông tin xử lý lead.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const assignees = useMemo(() => record?.assignees || [], [record])

  const save = async () => {
    if (!id || !record?.canUpdate || isSaving) return

    setIsSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/form-submissions/${id}/triage`, {
        body: JSON.stringify({
          assignedTo: assignedTo || null,
          expectedVersion: record.version,
          salesNote: note || null,
          salesStatus: status || null,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const body = (await response.json().catch(() => null)) as { message?: string } | null

      if (response.status === 409) {
        throw new Error('Lead đã được cập nhật bởi người khác. Hãy tải lại trước khi ghi tiếp.')
      }
      if (!response.ok) {
        throw new Error(body?.message || 'Không lưu được trạng thái xử lý lead.')
      }

      await load()
      setMessage('Đã lưu trạng thái xử lý lead.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được trạng thái xử lý lead.')
    } finally {
      setIsSaving(false)
    }
  }

  if (id === undefined) return null

  return (
    <section className="wings-lead-triage" aria-labelledby="wings-lead-triage-title">
      <div className="wings-lead-triage__header">
        <div>
          <strong id="wings-lead-triage-title">Xử lý lead</strong>
          <p>Chỉ metadata vận hành được cập nhật ở đây; nội dung form và trạng thái delivery không đổi.</p>
        </div>
        {record?.canUpdate ? <span>Site Manager / Super Admin</span> : <span>Chỉ xem</span>}
      </div>

      {isLoading ? <p>Đang tải trạng thái xử lý...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}

      {record ? (
        <div className="wings-lead-triage__fields">
          <label>
            Trạng thái xử lý
            <select
              disabled={!record.canUpdate || isSaving}
              onChange={(event) => setStatus(event.target.value as SalesStatus | '')}
              value={status}
            >
              <option value="">Chưa phân loại</option>
              {salesStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nhân viên phụ trách
            <select
              disabled={!record.canUpdate || isSaving}
              onChange={(event) => setAssignedTo(event.target.value)}
              value={assignedTo}
            >
              <option value="">Chưa phân công</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assigneeLabel(assignee)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ghi chú nội bộ
            <textarea
              disabled={!record.canUpdate || isSaving}
              maxLength={SALES_NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              value={note}
            />
            <small>{note.length}/{SALES_NOTE_MAX_LENGTH}</small>
          </label>

          {record.salesUpdatedAt ? (
            <p>
              Cập nhật lần cuối: {formatAdminDate(record.salesUpdatedAt)}
            </p>
          ) : (
            <p>Chưa có cập nhật xử lý.</p>
          )}

          {record.canUpdate ? (
            <button disabled={isSaving} onClick={() => void save()} type="button">
              {isSaving ? 'Đang lưu...' : 'Lưu xử lý lead'}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
