'use client'

import { useDocumentEvents, useDocumentInfo, useFormModified, useLocale } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { TourAuthoringAction, TourAuthoringIssue, TourAuthoringReadiness, TourAuthoringWrapper } from './types'

const copyByLocale = {
  en: {
    actionBlocked: 'Save the tour before using Preview or publication actions.',
    actionFailed: 'The action could not be completed.',
    actionHint: 'Follow the highlighted steps above. The Publish button stays disabled until every required item is ready.',
    addDeparture: 'Add a departure',
    candidate: 'Available wrappers',
    candidatesHelp: 'Choose a wrapper with the exact expected path. Relinking only changes the relationship; it does not delete page content.',
    departure: 'Departures',
    departureHelp: 'Select the departure dates that should be public. Draft dates remain private until selected and published.',
    draftPreview: 'Preview draft',
    expectedPath: 'Expected URL',
    fixSlug: 'Edit slug',
    fixTitle: 'Edit title',
    heroMedia: 'Public hero image',
    heroMissing: 'Not selected',
    heroReady: 'Selected',
    health: 'Health',
    healthInvalidPath: 'Path does not match this tour slug.',
    healthInvalidSite: 'Wrapper belongs to another site.',
    healthOrphan: 'Wrapper is not linked to a tour product.',
    healthShared: 'Wrapper is linked to more than one tour.',
    healthValid: 'Ready',
    issueDefaultDetail: 'Review this item before trying to publish again.',
    issueDefaultTitle: 'Needs review',
    issueEditorDetail: 'Your account can save drafts, but a site manager or super-admin must publish this tour.',
    issueEditorTitle: 'Waiting for an approver',
    issueInvalidSlugDetail: 'The public route cannot be generated until the slug contains a valid single path segment.',
    issueInvalidSlugTitle: 'Slug is missing or invalid',
    issueMissingTitleDetail: 'The tour needs a title in the selected content language before a wrapper can be created.',
    issueMissingTitleTitle: 'Tour title is missing',
    issueMissingHeroMediaDetail: 'The /tour/<slug> page reads Hero media or Gallery from this TourProduct. An image entered on the wrapper Page does not replace it.',
    issueMissingHeroMediaTitle: 'Public hero image is missing',
    issueMissingWrapperDetail: 'A wrapper Page renders the tour on the public website. Create it before publication.',
    issueMissingWrapperTitle: 'No public wrapper yet',
    issueNoDeparturesDetail: 'Add at least one departure with a date and price, then select it below when publishing.',
    issueNoDeparturesTitle: 'No departure to publish',
    issueOrphanWrapperDetail: 'This page exists but is not linked to a TourProduct. Choose a matching wrapper or create a replacement.',
    issueOrphanWrapperTitle: 'Wrapper is not linked',
    issueSharedWrapperDetail: 'Two tours cannot safely share the same public page. Assign a unique wrapper to this tour.',
    issueSharedWrapperTitle: 'Wrapper is shared',
    issueInvalidSiteDetail: 'The wrapper belongs to another site and cannot render this WingsGo tour.',
    issueInvalidSiteTitle: 'Wrapper belongs to another site',
    issueInvalidWrapperDetail: 'The wrapper path differs from the expected URL. Create a replacement or assign a matching candidate.',
    issueInvalidWrapperTitle: 'Wrapper URL does not match',
    loadFailed: 'Could not load publication status. Check the site and your access, then try again.',
    loading: 'Loading publication status…',
    noWrapper: 'No tour page yet',
    openCms: 'Open wrapper in CMS',
    openPublic: 'Open public page',
    provision: 'Create draft wrapper',
    provisionInvalid: 'Create replacement wrapper',
    publish: 'Publish tour',
    publishBlocked: 'Resolve the highlighted items before publishing.',
    publishReady: 'This tour meets the technical requirements. Select one or more departures and publish when approved.',
    publishWaiting: 'The tour is ready for review. A site manager or super-admin must complete publication.',
    readiness: 'Publication status',
    reload: 'Reload',
    relink: 'Assign this wrapper',
    revisionConflict: 'The version changed. Reload and try again.',
    selectDeparture: 'Select at least one departure to enable Publish.',
    status: 'Status',
    statusBlocked: 'Action required',
    statusReady: 'Ready to publish',
    statusWaiting: 'Waiting for approval',
    severityInfo: 'Info',
    severityWarning: 'Warning',
    stepDeparture: 'Add and select a departure',
    stepHero: 'Add the public hero image',
    stepPublish: 'Preview, then publish',
    stepSave: 'Save tour changes',
    stepTitle: 'Follow these steps',
    stepWrapper: 'Create a matching wrapper',
    wrapper: 'Wrapper',
    wrapperPath: 'Current URL',
  },
  vi: {
    actionBlocked: 'Hãy lưu tour trước khi dùng Preview hoặc thao tác xuất bản.',
    actionFailed: 'Không thực hiện được thao tác.',
    actionHint: 'Làm theo các bước được đánh dấu. Nút Xuất bản chỉ bật khi toàn bộ điều kiện bắt buộc đã sẵn sàng.',
    addDeparture: 'Thêm lịch khởi hành',
    candidate: 'Wrapper có thể gán',
    candidatesHelp: 'Chọn wrapper có đúng đường dẫn dự kiến. Gán lại chỉ đổi quan hệ với tour, không xóa nội dung trang.',
    departure: 'Lịch khởi hành',
    departureHelp: 'Chọn những ngày muốn hiển thị public. Lịch draft vẫn riêng tư cho đến khi được chọn và xuất bản.',
    draftPreview: 'Xem preview bản nháp',
    expectedPath: 'Đường dẫn dự kiến',
    fixSlug: 'Sửa slug',
    fixTitle: 'Sửa tiêu đề',
    heroMedia: 'Ảnh hero public',
    heroMissing: 'Chưa chọn',
    heroReady: 'Đã chọn',
    health: 'Tình trạng',
    healthInvalidPath: 'Đường dẫn wrapper không khớp slug tour.',
    healthInvalidSite: 'Wrapper thuộc site khác.',
    healthOrphan: 'Wrapper chưa được liên kết với tour nào.',
    healthShared: 'Wrapper đang được nhiều tour dùng chung.',
    healthValid: 'Sẵn sàng',
    issueDefaultDetail: 'Kiểm tra mục này trước khi thử xuất bản lại.',
    issueDefaultTitle: 'Cần kiểm tra',
    issueEditorDetail: 'Tài khoản của bạn có thể lưu nháp, nhưng site-manager hoặc super-admin phải xuất bản tour.',
    issueEditorTitle: 'Đang chờ người duyệt',
    issueInvalidSlugDetail: 'Không thể tạo đường dẫn public nếu slug trống, chứa dấu / hoặc có định dạng không hợp lệ.',
    issueInvalidSlugTitle: 'Slug đang thiếu hoặc không hợp lệ',
    issueMissingTitleDetail: 'Tour cần có tiêu đề ở ngôn ngữ đang chọn trước khi tạo wrapper.',
    issueMissingTitleTitle: 'Tour chưa có tiêu đề',
    issueMissingHeroMediaDetail: 'Trang /tour/<slug> chỉ đọc ảnh Hero media hoặc Gallery của TourProduct. Ảnh nhập ở Wrapper Page không thay thế được ảnh này.',
    issueMissingHeroMediaTitle: 'Tour chưa có ảnh hero public',
    issueMissingWrapperDetail: 'Wrapper là Page render tour trên website public. Hãy tạo wrapper trước khi xuất bản.',
    issueMissingWrapperTitle: 'Chưa có wrapper public',
    issueNoDeparturesDetail: 'Thêm ít nhất một lịch có ngày và giá, sau đó chọn lịch ở bên dưới khi xuất bản.',
    issueNoDeparturesTitle: 'Chưa có lịch để xuất bản',
    issueOrphanWrapperDetail: 'Page này tồn tại nhưng chưa liên kết với TourProduct. Hãy chọn wrapper khớp hoặc tạo wrapper thay thế.',
    issueOrphanWrapperTitle: 'Wrapper chưa được liên kết',
    issueSharedWrapperDetail: 'Hai tour không nên dùng chung một Page public. Hãy gán wrapper riêng cho tour này.',
    issueSharedWrapperTitle: 'Wrapper đang bị dùng chung',
    issueInvalidSiteDetail: 'Wrapper thuộc site khác nên không thể render tour WingsGo này.',
    issueInvalidSiteTitle: 'Wrapper thuộc site khác',
    issueInvalidWrapperDetail: 'Đường dẫn wrapper khác đường dẫn dự kiến. Hãy tạo wrapper thay thế hoặc gán candidate khớp.',
    issueInvalidWrapperTitle: 'URL wrapper không khớp',
    loadFailed: 'Không tải được trạng thái xuất bản. Kiểm tra site và quyền truy cập rồi thử lại.',
    loading: 'Đang tải trạng thái xuất bản…',
    noWrapper: 'Chưa có trang tour',
    openCms: 'Mở wrapper trong CMS',
    openPublic: 'Mở trang public',
    provision: 'Tạo wrapper bản nháp',
    provisionInvalid: 'Tạo wrapper thay thế',
    publish: 'Xuất bản tour',
    publishBlocked: 'Hãy xử lý các mục được đánh dấu trước khi xuất bản.',
    publishReady: 'Tour đã đủ điều kiện kỹ thuật. Chọn một hoặc nhiều lịch rồi xuất bản sau khi được duyệt.',
    publishWaiting: 'Tour đã sẵn sàng để kiểm duyệt. Site-manager hoặc super-admin cần hoàn tất xuất bản.',
    readiness: 'Trạng thái xuất bản',
    reload: 'Tải lại',
    relink: 'Gán wrapper này',
    revisionConflict: 'Phiên bản đã thay đổi. Hãy tải lại rồi thử lại.',
    selectDeparture: 'Chọn ít nhất một lịch để bật nút Xuất bản.',
    status: 'Trạng thái',
    statusBlocked: 'Cần xử lý',
    statusReady: 'Đủ điều kiện xuất bản',
    statusWaiting: 'Đang chờ duyệt',
    severityInfo: 'Thông tin',
    severityWarning: 'Cảnh báo',
    stepDeparture: 'Thêm và chọn lịch khởi hành',
    stepHero: 'Nhập ảnh hero public',
    stepPublish: 'Preview rồi xuất bản',
    stepSave: 'Lưu thay đổi tour',
    stepTitle: 'Các bước cần làm',
    stepWrapper: 'Tạo wrapper đúng đường dẫn',
    wrapper: 'Wrapper',
    wrapperPath: 'Đường dẫn hiện tại',
  },
} as const

type LocaleCopy = { [Key in keyof (typeof copyByLocale)['vi']]: string }
type IssueAction = 'candidates' | 'departures' | 'hero' | 'provision' | 'slug' | 'title'

const getErrorBody = async (response: Response) => response.json().catch(() => ({})) as Promise<{ code?: string; message?: string }>

const healthLabel = (wrapper: TourAuthoringWrapper | null, copy: LocaleCopy) => {
  if (!wrapper?.health) return '—'
  if (wrapper.health === 'valid') return copy.healthValid
  if (wrapper.health === 'shared') return copy.healthShared
  if (wrapper.health === 'orphan') return copy.healthOrphan
  return wrapper.health === 'invalid_site' ? copy.healthInvalidSite : copy.healthInvalidPath
}

const issueGuidance = (issue: TourAuthoringIssue, copy: LocaleCopy): { action?: IssueAction; detail: string; title: string } => {
  switch (issue.code) {
    case 'invalid_slug': return { action: 'slug', detail: copy.issueInvalidSlugDetail, title: copy.issueInvalidSlugTitle }
    case 'missing_title': return { action: 'title', detail: copy.issueMissingTitleDetail, title: copy.issueMissingTitleTitle }
    case 'missing_hero_media': return { action: 'hero', detail: copy.issueMissingHeroMediaDetail, title: copy.issueMissingHeroMediaTitle }
    case 'missing_wrapper': return { action: 'provision', detail: copy.issueMissingWrapperDetail, title: copy.issueMissingWrapperTitle }
    case 'invalid_wrapper': return { action: 'provision', detail: copy.issueInvalidWrapperDetail, title: copy.issueInvalidWrapperTitle }
    case 'invalid_wrapper_site': return { action: 'candidates', detail: copy.issueInvalidSiteDetail, title: copy.issueInvalidSiteTitle }
    case 'orphan_wrapper': return { action: 'candidates', detail: copy.issueOrphanWrapperDetail, title: copy.issueOrphanWrapperTitle }
    case 'shared_wrapper': return { action: 'candidates', detail: copy.issueSharedWrapperDetail, title: copy.issueSharedWrapperTitle }
    case 'no_departures': return { action: 'departures', detail: copy.issueNoDeparturesDetail, title: copy.issueNoDeparturesTitle }
    case 'editor_cannot_publish': return { detail: copy.issueEditorDetail, title: copy.issueEditorTitle }
    default: return { detail: copy.issueDefaultDetail, title: copy.issueDefaultTitle }
  }
}

const severityLabel = (severity: TourAuthoringIssue['severity'], copy: LocaleCopy) => {
  if (severity === 'error') return copy.statusBlocked
  if (severity === 'warning') return copy.severityWarning
  return copy.severityInfo
}

const errorHelp = (code: string | null, copy: LocaleCopy) => {
  if (code === 'wrapper_forbidden') return copy.issueEditorDetail
  if (code === 'stale_revision') return copy.revisionConflict
  if (code === 'path_occupied') return copy.issueInvalidWrapperDetail
  return copy.actionHint
}

const scrollToElement = (target: string) => {
  const element = document.getElementById(target) || document.querySelector(`[name="${target}"]`)
  if (!(element instanceof HTMLElement)) return
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (element.tabIndex < 0) element.tabIndex = -1
  element.focus({ preventScroll: true })
}

export default function TourAuthoringReadiness({ departureRevision = 0 }: { departureRevision?: number }) {
  const { id } = useDocumentInfo()
  const { code: locale } = useLocale()
  const { reportUpdate } = useDocumentEvents()
  const contextKey = `${id}:${locale}`
  const currentContext = useRef(contextKey)
  const contextVersion = useRef(0)
  if (currentContext.current !== contextKey) {
    currentContext.current = contextKey
    contextVersion.current += 1
  }
  const generation = contextVersion.current
  const copy = locale === 'en' ? copyByLocale.en : copyByLocale.vi
  const loadFailedMessage = copy.loadFailed
  const formModified = useFormModified()
  const [readiness, setReadiness] = useState<TourAuthoringReadiness | null>(null)
  const [selectedDepartureIDs, setSelectedDepartureIDs] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<TourAuthoringAction | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    setBusy(null)
  }, [contextKey])

  const load = useCallback(async () => {
    if (id == null || id === 'create') return
    setLoading(true)
    setError('')
    setErrorCode(null)
    setHidden(false)
    const response = await fetch(`/api/tour-authoring/${encodeURIComponent(String(id))}?locale=${encodeURIComponent(locale || 'vi')}`, { credentials: 'include' })
    const body = await getErrorBody(response)
    if (!response.ok) {
      if (response.status === 404 && body.code === 'not_wingsgo') {
        setHidden(true)
        setLoading(false)
        return
      }
      throw Object.assign(new Error(body.message || loadFailedMessage), { code: body.code || 'load_failed' })
    }

      setReadiness(body as unknown as TourAuthoringReadiness)
    setLoading(false)
  }, [id, locale, loadFailedMessage])

  useEffect(() => {
    if (id == null || id === 'create') {
      setLoading(false)
      return
    }
    void load().catch((reason: Error & { code?: string }) => {
      setLoading(false)
      setErrorCode(reason.code || 'load_failed')
      setError(reason.message || loadFailedMessage)
    })
  }, [departureRevision, id, load, loadFailedMessage, reloadToken])

  const runAction = async (actionName: TourAuthoringAction, wrapperID?: number | string) => {
    if (!readiness || formModified || busy) return
    const requestGeneration = generation
    const requestId = id
    const departureIDs = readiness.departures.filter(({ id: departureID }) => selectedDepartureIDs.has(String(departureID))).map(({ id: departureID }) => departureID)
    if (actionName === 'publish' && departureIDs.length === 0) return
    if (actionName === 'relink' && wrapperID == null) return
    if (
      actionName === 'publish' &&
      !window.confirm(
        locale === 'en'
          ? `Publish TourProduct #${readiness.product.id} with Page #${readiness.wrapper?.id || '—'} (${readiness.wrapper?.path || readiness.product.expectedPath || '—'}) and departures ${departureIDs.map((departureID) => `#${departureID}`).join(', ')}?`
          : `Xuất bản TourProduct #${readiness.product.id}, Page #${readiness.wrapper?.id || '—'} (${readiness.wrapper?.path || readiness.product.expectedPath || '—'}) và các lịch ${departureIDs.map((departureID) => `#${departureID}`).join(', ')}?`,
      )
    ) return
    setBusy(actionName)
    setError('')
    setErrorCode(null)
    try {
      const response = await fetch(`/api/tour-authoring/${encodeURIComponent(String(id))}`, {
        body: JSON.stringify({ action: actionName, departureIDs, locale: locale || 'vi', revision: readiness.revision, wrapperID }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = await getErrorBody(response)
      if (!response.ok) {
        const code = body.code || 'action_failed'
        if (contextVersion.current === requestGeneration) {
          setErrorCode(code)
          setError(code === 'stale_revision' ? copy.revisionConflict : body.message || copy.actionFailed)
        }
        return
      }
      if (contextVersion.current !== requestGeneration) return

      setReadiness(body as unknown as TourAuthoringReadiness)
      if (requestId != null && requestId !== 'create') {
        reportUpdate?.({
          entitySlug: 'tour-products',
          id: requestId,
          operation: 'update',
          updatedAt: new Date().toISOString(),
        })
      }
    } catch {
      if (contextVersion.current === requestGeneration) {
        setErrorCode('action_failed')
        setError(copy.actionFailed)
      }
    } finally {
      if (contextVersion.current === requestGeneration) {
        setBusy(null)
      }
    }
  }

  if (id == null || id === 'create' || hidden) return null
  if (loading) return <section aria-label={copy.readiness} className="tour-authoring-readiness"><p>{copy.loading}</p></section>
  if (error && !readiness) {
    return <section aria-label={copy.readiness} className="tour-authoring-readiness tour-authoring-readiness--blocked">
      <div className="tour-authoring-readiness__status" role="alert"><span className="tour-authoring-readiness__status-icon">!</span><div><strong>{copy.statusBlocked}</strong><p>{error}</p><small>{errorHelp(errorCode, copy)}</small></div></div>
      <button type="button" onClick={() => setReloadToken((value) => value + 1)}>{copy.reload}</button>
    </section>
  }
  if (!readiness) return null

  const selectedDepartureCount = readiness.departures.filter(({ id: departureID }) => selectedDepartureIDs.has(String(departureID))).length
  const wrapperCandidates = readiness.wrapperCandidates || []
  const wrapperIsValid = readiness.wrapper?.health === 'valid'
  const hasPrerequisiteIssues = readiness.issues.some((issue) => issue.code !== 'editor_cannot_publish')
  const statusTone = formModified || hasPrerequisiteIssues ? 'blocked' : readiness.canPublish ? 'ready' : 'waiting'
  const statusLabel = statusTone === 'ready' ? copy.statusReady : statusTone === 'waiting' ? copy.statusWaiting : copy.statusBlocked
  const statusDescription = formModified ? copy.actionBlocked : statusTone === 'ready' ? copy.publishReady : statusTone === 'waiting' ? copy.publishWaiting : copy.publishBlocked
  const previewHref = readiness.wrapper
    ? `/next/preview?${new URLSearchParams({ collection: 'pages', id: String(readiness.wrapper.id), locale: locale || 'vi', path: readiness.wrapper.path || readiness.product.expectedPath || '/' }).toString()}`
    : null
  const publishDisabledReason = formModified
    ? copy.actionBlocked
    : !readiness.canPublish
      ? copy.publishBlocked
      : selectedDepartureCount === 0
        ? copy.selectDeparture
        : null
  const steps = [
    { label: copy.stepSave, state: formModified ? 'current' : 'done' },
    { label: copy.stepHero, state: readiness.product.hasHeroMedia ? 'done' : 'current' },
    { label: copy.stepWrapper, state: wrapperIsValid ? 'done' : 'current' },
    { label: copy.stepDeparture, state: readiness.departures.length > 0 && selectedDepartureCount > 0 ? 'done' : 'current' },
    { label: copy.stepPublish, state: readiness.canPublish && selectedDepartureCount > 0 ? 'done' : 'current' },
  ] as const

  const handleIssueAction = (action?: IssueAction) => {
    if (action === 'provision') return void runAction('provision')
    if (action === 'candidates') return scrollToElement('tour-authoring-candidates')
    if (action === 'departures') return scrollToElement('tour-departures')
    if (action === 'hero') return scrollToElement('field-heroMedia')
    if (action === 'slug') return scrollToElement('field-slug')
    if (action === 'title') return scrollToElement('field-title')
  }

  return <section aria-busy={busy !== null || loading} aria-label={copy.readiness} className={`tour-authoring-readiness tour-authoring-readiness--${statusTone}`}>
    <div className="tour-authoring-readiness__status">
      <span className="tour-authoring-readiness__status-icon" aria-hidden="true">{statusTone === 'ready' ? '✓' : statusTone === 'waiting' ? '◷' : '!'}</span>
      <div><strong>{statusLabel}</strong><p>{statusDescription}</p></div>
    </div>

    <div className="tour-authoring-readiness__steps" aria-label={copy.stepTitle}>
      <strong>{copy.stepTitle}</strong>
      <ol>{steps.map((step, index) => <li className={`tour-authoring-readiness__step tour-authoring-readiness__step--${step.state}`} key={step.label} aria-current={step.state === 'current' ? 'step' : undefined}><span>{index + 1}</span>{step.label}</li>)}</ol>
    </div>

    <dl className="tour-authoring-readiness__facts">
      <div><dt>{copy.expectedPath}</dt><dd>{readiness.product.expectedPath || '—'}</dd></div>
      <div><dt>{copy.status}</dt><dd>{readiness.product.status || 'draft'}</dd></div>
      <div><dt>{copy.wrapper}</dt><dd>#{readiness.wrapper?.id || '—'}</dd></div>
      <div><dt>{copy.wrapperPath}</dt><dd>{readiness.wrapper?.path || copy.noWrapper}</dd></div>
      <div><dt>{copy.health}</dt><dd><span className={`tour-authoring-readiness__health tour-authoring-readiness__health--${readiness.wrapper?.health || 'missing'}`}>{healthLabel(readiness.wrapper, copy)}</span></dd></div>
      <div><dt>{copy.heroMedia}</dt><dd><span className={`tour-authoring-readiness__health tour-authoring-readiness__health--${readiness.product.hasHeroMedia ? 'valid' : 'missing'}`}>{readiness.product.hasHeroMedia ? copy.heroReady : copy.heroMissing}</span></dd></div>
    </dl>

    {readiness.wrapper && <div className="tour-authoring-readiness__links">
      <a href={`/admin/collections/pages/${encodeURIComponent(String(readiness.wrapper.id))}`}>{copy.openCms}</a>
      {previewHref && <a href={previewHref}>{copy.draftPreview}</a>}
      {readiness.wrapper.status === 'published' && readiness.wrapper.path && <a href={readiness.wrapper.path}>{copy.openPublic}</a>}
    </div>}

    {readiness.issues.length > 0 && <div className="tour-authoring-readiness__issues" aria-live="polite">
      <strong>{copy.actionHint}</strong>
      {readiness.issues.map((issue) => {
        const guidance = issueGuidance(issue, copy)
        const action = issue.code === 'missing_wrapper' && wrapperCandidates.length > 0
          ? 'candidates'
          : guidance.action === 'candidates' && wrapperCandidates.length === 0
            ? 'provision'
            : guidance.action
        return <article className={`tour-authoring-readiness__issue tour-authoring-readiness__issue--${issue.severity}`} key={`${issue.code}-${issue.message}`}>
          <div className="tour-authoring-readiness__issue-heading"><span>{severityLabel(issue.severity, copy)}</span><strong>{guidance.title}</strong></div>
          <p>{issue.message}</p>
          <small>{guidance.detail}</small>
          {action && <button disabled={busy !== null || formModified} type="button" onClick={() => handleIssueAction(action)}>{action === 'provision' ? (readiness.wrapper ? copy.provisionInvalid : copy.provision) : action === 'candidates' ? copy.candidate : action === 'departures' ? copy.addDeparture : action === 'slug' ? copy.fixSlug : copy.fixTitle}</button>}
        </article>
      })}
    </div>}

    {!wrapperIsValid && wrapperCandidates.length > 0 && <fieldset className="tour-authoring-readiness__candidates" disabled={busy !== null || formModified} id="tour-authoring-candidates">
      <legend>{copy.candidate}</legend>
      <p>{copy.candidatesHelp}</p>
      {wrapperCandidates.map((candidate) => <div className="tour-authoring-readiness__candidate" key={candidate.id}>
        <span><b>#{candidate.id}</b> · {candidate.path} · {candidate.status || 'draft'} · {healthLabel(candidate, copy)}</span>
        {(candidate.health === 'valid' || candidate.health === 'orphan') && <button type="button" onClick={() => void runAction('relink', candidate.id)}>{busy === 'relink' ? `${copy.relink}…` : copy.relink}</button>}
      </div>)}
    </fieldset>}

    <fieldset className="tour-authoring-readiness__departures" disabled={busy !== null} id="tour-authoring-publish-departures">
      <legend>{copy.departure}</legend>
      <p>{copy.departureHelp}</p>
      {readiness.departures.map((departure) => <label key={departure.id}><input aria-label={`${copy.departure} #${departure.id}`} checked={selectedDepartureIDs.has(String(departure.id))} onChange={() => setSelectedDepartureIDs((current) => { const next = new Set(current); const key = String(departure.id); if (next.has(key)) next.delete(key); else next.add(key); return next })} type="checkbox" /> <span>#{departure.id}</span> <small>{departure.status || '—'}</small></label>)}
      {!readiness.departures.length && <span className="tour-authoring-readiness__empty">{copy.issueNoDeparturesTitle}</span>}
    </fieldset>

    {formModified && <p className="tour-authoring-readiness__inline-warning" role="status">{copy.actionBlocked}</p>}
    {error && <div className="tour-authoring-readiness__error" role="alert"><strong>{copy.statusBlocked}</strong><p>{error}</p><small>{errorHelp(errorCode, copy)}</small></div>}
    <div className="tour-authoring-readiness__actions">
      {(!readiness.wrapper || !wrapperIsValid) && <button disabled={formModified || busy !== null} type="button" onClick={() => void runAction('provision')}>{busy === 'provision' ? `${readiness.wrapper ? copy.provisionInvalid : copy.provision}…` : readiness.wrapper ? copy.provisionInvalid : copy.provision}</button>}
      <div className="tour-authoring-readiness__publish-action">
        <button aria-describedby={publishDisabledReason ? 'tour-authoring-publish-hint' : undefined} className="tour-authoring-readiness__publish-button" disabled={formModified || busy !== null || !readiness.canPublish || selectedDepartureCount === 0} type="button" onClick={() => void runAction('publish')}>{busy === 'publish' ? '…' : copy.publish}</button>
        {publishDisabledReason && <small id="tour-authoring-publish-hint">{publishDisabledReason}</small>}
      </div>
    </div>
  </section>
}
