"use strict";
"use client";
import { jsx, jsxs } from "react/jsx-runtime";
import * as PayloadUI from "@payloadcms/ui";
import { useDocumentInfo, useFormModified, useLocale } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";
const copyByLocale = {
  en: {
    actionBlocked: "Save the tour before using Preview or publication actions.",
    actionFailed: "The action could not be completed.",
    actionHint: "Follow the highlighted steps above. The Publish button stays disabled until every required item is ready.",
    addDeparture: "Add a departure",
    candidate: "Available wrappers",
    candidatesHelp: "Choose a wrapper with the exact expected path. Relinking only changes the relationship; it does not delete page content.",
    departure: "Departures",
    departureHelp: "Select the departure dates that should be public. Draft dates remain private until selected and published.",
    draftPreview: "Preview draft",
    expectedPath: "Expected URL",
    fixSlug: "Edit slug",
    fixTitle: "Edit title",
    heroMedia: "Public hero image",
    heroMissing: "Not selected",
    heroReady: "Selected",
    health: "Health",
    healthInvalidPath: "Path does not match this tour slug.",
    healthInvalidSite: "Wrapper belongs to another site.",
    healthOrphan: "Wrapper is not linked to a tour product.",
    healthShared: "Wrapper is linked to more than one tour.",
    healthValid: "Ready",
    issueDefaultDetail: "Review this item before trying to publish again.",
    issueDefaultTitle: "Needs review",
    issueEditorDetail: "Your account can save drafts, but a site manager or super-admin must publish this tour.",
    issueEditorTitle: "Waiting for an approver",
    issueInvalidSlugDetail: "The public route cannot be generated until the slug contains a valid single path segment.",
    issueInvalidSlugTitle: "Slug is missing or invalid",
    issueMissingTitleDetail: "The tour needs a title in the selected content language before a wrapper can be created.",
    issueMissingTitleTitle: "Tour title is missing",
    issueMissingHeroMediaDetail: "The /tour/<slug> page reads Hero media or Gallery from this TourProduct. An image entered on the wrapper Page does not replace it.",
    issueMissingHeroMediaTitle: "Public hero image is missing",
    issueMissingWrapperDetail: "A wrapper Page renders the tour on the public website. Create it before publication.",
    issueMissingWrapperTitle: "No public wrapper yet",
    issueNoDeparturesDetail: "Add at least one departure with a date and price, then select it below when publishing.",
    issueNoDeparturesTitle: "No departure to publish",
    issueOrphanWrapperDetail: "This page exists but is not linked to a TourProduct. Choose a matching wrapper or create a replacement.",
    issueOrphanWrapperTitle: "Wrapper is not linked",
    issueSharedWrapperDetail: "Two tours cannot safely share the same public page. Assign a unique wrapper to this tour.",
    issueSharedWrapperTitle: "Wrapper is shared",
    issueInvalidSiteDetail: "The wrapper belongs to another site and cannot render this WingsGo tour.",
    issueInvalidSiteTitle: "Wrapper belongs to another site",
    issueInvalidWrapperDetail: "The wrapper path differs from the expected URL. Create a replacement or assign a matching candidate.",
    issueInvalidWrapperTitle: "Wrapper URL does not match",
    loadFailed: "Could not load publication status. Check the site and your access, then try again.",
    loading: "Loading publication status\u2026",
    noWrapper: "No tour page yet",
    openCms: "Open wrapper in CMS",
    openPublic: "Open public page",
    provision: "Create draft wrapper",
    provisionInvalid: "Create replacement wrapper",
    publish: "Publish tour",
    publishBlocked: "Resolve the highlighted items before publishing.",
    publishReady: "This tour meets the technical requirements. Select one or more departures and publish when approved.",
    publishWaiting: "The tour is ready for review. A site manager or super-admin must complete publication.",
    readiness: "Publication status",
    reload: "Reload",
    relink: "Assign this wrapper",
    revisionConflict: "The version changed. Reload and try again.",
    selectDeparture: "Select at least one departure to enable Publish.",
    status: "Status",
    statusBlocked: "Action required",
    statusReady: "Ready to publish",
    statusWaiting: "Waiting for approval",
    severityInfo: "Info",
    severityWarning: "Warning",
    stepDeparture: "Add and select a departure",
    stepHero: "Add the public hero image",
    stepPublish: "Preview, then publish",
    stepSave: "Save tour changes",
    stepTitle: "Follow these steps",
    stepWrapper: "Create a matching wrapper",
    wrapper: "Wrapper",
    wrapperPath: "Current URL"
  },
  vi: {
    actionBlocked: "H\xE3y l\u01B0u tour tr\u01B0\u1EDBc khi d\xF9ng Preview ho\u1EB7c thao t\xE1c xu\u1EA5t b\u1EA3n.",
    actionFailed: "Kh\xF4ng th\u1EF1c hi\u1EC7n \u0111\u01B0\u1EE3c thao t\xE1c.",
    actionHint: "L\xE0m theo c\xE1c b\u01B0\u1EDBc \u0111\u01B0\u1EE3c \u0111\xE1nh d\u1EA5u. N\xFAt Xu\u1EA5t b\u1EA3n ch\u1EC9 b\u1EADt khi to\xE0n b\u1ED9 \u0111i\u1EC1u ki\u1EC7n b\u1EAFt bu\u1ED9c \u0111\xE3 s\u1EB5n s\xE0ng.",
    addDeparture: "Th\xEAm l\u1ECBch kh\u1EDFi h\xE0nh",
    candidate: "Wrapper c\xF3 th\u1EC3 g\xE1n",
    candidatesHelp: "Ch\u1ECDn wrapper c\xF3 \u0111\xFAng \u0111\u01B0\u1EDDng d\u1EABn d\u1EF1 ki\u1EBFn. G\xE1n l\u1EA1i ch\u1EC9 \u0111\u1ED5i quan h\u1EC7 v\u1EDBi tour, kh\xF4ng x\xF3a n\u1ED9i dung trang.",
    departure: "L\u1ECBch kh\u1EDFi h\xE0nh",
    departureHelp: "Ch\u1ECDn nh\u1EEFng ng\xE0y mu\u1ED1n hi\u1EC3n th\u1ECB public. L\u1ECBch draft v\u1EABn ri\xEAng t\u01B0 cho \u0111\u1EBFn khi \u0111\u01B0\u1EE3c ch\u1ECDn v\xE0 xu\u1EA5t b\u1EA3n.",
    draftPreview: "Xem preview b\u1EA3n nh\xE1p",
    expectedPath: "\u0110\u01B0\u1EDDng d\u1EABn d\u1EF1 ki\u1EBFn",
    fixSlug: "S\u1EEDa slug",
    fixTitle: "S\u1EEDa ti\xEAu \u0111\u1EC1",
    heroMedia: "\u1EA2nh hero public",
    heroMissing: "Ch\u01B0a ch\u1ECDn",
    heroReady: "\u0110\xE3 ch\u1ECDn",
    health: "T\xECnh tr\u1EA1ng",
    healthInvalidPath: "\u0110\u01B0\u1EDDng d\u1EABn wrapper kh\xF4ng kh\u1EDBp slug tour.",
    healthInvalidSite: "Wrapper thu\u1ED9c site kh\xE1c.",
    healthOrphan: "Wrapper ch\u01B0a \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt v\u1EDBi tour n\xE0o.",
    healthShared: "Wrapper \u0111ang \u0111\u01B0\u1EE3c nhi\u1EC1u tour d\xF9ng chung.",
    healthValid: "S\u1EB5n s\xE0ng",
    issueDefaultDetail: "Ki\u1EC3m tra m\u1EE5c n\xE0y tr\u01B0\u1EDBc khi th\u1EED xu\u1EA5t b\u1EA3n l\u1EA1i.",
    issueDefaultTitle: "C\u1EA7n ki\u1EC3m tra",
    issueEditorDetail: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n c\xF3 th\u1EC3 l\u01B0u nh\xE1p, nh\u01B0ng site-manager ho\u1EB7c super-admin ph\u1EA3i xu\u1EA5t b\u1EA3n tour.",
    issueEditorTitle: "\u0110ang ch\u1EDD ng\u01B0\u1EDDi duy\u1EC7t",
    issueInvalidSlugDetail: "Kh\xF4ng th\u1EC3 t\u1EA1o \u0111\u01B0\u1EDDng d\u1EABn public n\u1EBFu slug tr\u1ED1ng, ch\u1EE9a d\u1EA5u / ho\u1EB7c c\xF3 \u0111\u1ECBnh d\u1EA1ng kh\xF4ng h\u1EE3p l\u1EC7.",
    issueInvalidSlugTitle: "Slug \u0111ang thi\u1EBFu ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7",
    issueMissingTitleDetail: "Tour c\u1EA7n c\xF3 ti\xEAu \u0111\u1EC1 \u1EDF ng\xF4n ng\u1EEF \u0111ang ch\u1ECDn tr\u01B0\u1EDBc khi t\u1EA1o wrapper.",
    issueMissingTitleTitle: "Tour ch\u01B0a c\xF3 ti\xEAu \u0111\u1EC1",
    issueMissingHeroMediaDetail: "Trang /tour/<slug> ch\u1EC9 \u0111\u1ECDc \u1EA3nh Hero media ho\u1EB7c Gallery c\u1EE7a TourProduct. \u1EA2nh nh\u1EADp \u1EDF Wrapper Page kh\xF4ng thay th\u1EBF \u0111\u01B0\u1EE3c \u1EA3nh n\xE0y.",
    issueMissingHeroMediaTitle: "Tour ch\u01B0a c\xF3 \u1EA3nh hero public",
    issueMissingWrapperDetail: "Wrapper l\xE0 Page render tour tr\xEAn website public. H\xE3y t\u1EA1o wrapper tr\u01B0\u1EDBc khi xu\u1EA5t b\u1EA3n.",
    issueMissingWrapperTitle: "Ch\u01B0a c\xF3 wrapper public",
    issueNoDeparturesDetail: "Th\xEAm \xEDt nh\u1EA5t m\u1ED9t l\u1ECBch c\xF3 ng\xE0y v\xE0 gi\xE1, sau \u0111\xF3 ch\u1ECDn l\u1ECBch \u1EDF b\xEAn d\u01B0\u1EDBi khi xu\u1EA5t b\u1EA3n.",
    issueNoDeparturesTitle: "Ch\u01B0a c\xF3 l\u1ECBch \u0111\u1EC3 xu\u1EA5t b\u1EA3n",
    issueOrphanWrapperDetail: "Page n\xE0y t\u1ED3n t\u1EA1i nh\u01B0ng ch\u01B0a li\xEAn k\u1EBFt v\u1EDBi TourProduct. H\xE3y ch\u1ECDn wrapper kh\u1EDBp ho\u1EB7c t\u1EA1o wrapper thay th\u1EBF.",
    issueOrphanWrapperTitle: "Wrapper ch\u01B0a \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt",
    issueSharedWrapperDetail: "Hai tour kh\xF4ng n\xEAn d\xF9ng chung m\u1ED9t Page public. H\xE3y g\xE1n wrapper ri\xEAng cho tour n\xE0y.",
    issueSharedWrapperTitle: "Wrapper \u0111ang b\u1ECB d\xF9ng chung",
    issueInvalidSiteDetail: "Wrapper thu\u1ED9c site kh\xE1c n\xEAn kh\xF4ng th\u1EC3 render tour WingsGo n\xE0y.",
    issueInvalidSiteTitle: "Wrapper thu\u1ED9c site kh\xE1c",
    issueInvalidWrapperDetail: "\u0110\u01B0\u1EDDng d\u1EABn wrapper kh\xE1c \u0111\u01B0\u1EDDng d\u1EABn d\u1EF1 ki\u1EBFn. H\xE3y t\u1EA1o wrapper thay th\u1EBF ho\u1EB7c g\xE1n candidate kh\u1EDBp.",
    issueInvalidWrapperTitle: "URL wrapper kh\xF4ng kh\u1EDBp",
    loadFailed: "Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i xu\u1EA5t b\u1EA3n. Ki\u1EC3m tra site v\xE0 quy\u1EC1n truy c\u1EADp r\u1ED3i th\u1EED l\u1EA1i.",
    loading: "\u0110ang t\u1EA3i tr\u1EA1ng th\xE1i xu\u1EA5t b\u1EA3n\u2026",
    noWrapper: "Ch\u01B0a c\xF3 trang tour",
    openCms: "M\u1EDF wrapper trong CMS",
    openPublic: "M\u1EDF trang public",
    provision: "T\u1EA1o wrapper b\u1EA3n nh\xE1p",
    provisionInvalid: "T\u1EA1o wrapper thay th\u1EBF",
    publish: "Xu\u1EA5t b\u1EA3n tour",
    publishBlocked: "H\xE3y x\u1EED l\xFD c\xE1c m\u1EE5c \u0111\u01B0\u1EE3c \u0111\xE1nh d\u1EA5u tr\u01B0\u1EDBc khi xu\u1EA5t b\u1EA3n.",
    publishReady: "Tour \u0111\xE3 \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n k\u1EF9 thu\u1EADt. Ch\u1ECDn m\u1ED9t ho\u1EB7c nhi\u1EC1u l\u1ECBch r\u1ED3i xu\u1EA5t b\u1EA3n sau khi \u0111\u01B0\u1EE3c duy\u1EC7t.",
    publishWaiting: "Tour \u0111\xE3 s\u1EB5n s\xE0ng \u0111\u1EC3 ki\u1EC3m duy\u1EC7t. Site-manager ho\u1EB7c super-admin c\u1EA7n ho\xE0n t\u1EA5t xu\u1EA5t b\u1EA3n.",
    readiness: "Tr\u1EA1ng th\xE1i xu\u1EA5t b\u1EA3n",
    reload: "T\u1EA3i l\u1EA1i",
    relink: "G\xE1n wrapper n\xE0y",
    revisionConflict: "Phi\xEAn b\u1EA3n \u0111\xE3 thay \u0111\u1ED5i. H\xE3y t\u1EA3i l\u1EA1i r\u1ED3i th\u1EED l\u1EA1i.",
    selectDeparture: "Ch\u1ECDn \xEDt nh\u1EA5t m\u1ED9t l\u1ECBch \u0111\u1EC3 b\u1EADt n\xFAt Xu\u1EA5t b\u1EA3n.",
    status: "Tr\u1EA1ng th\xE1i",
    statusBlocked: "C\u1EA7n x\u1EED l\xFD",
    statusReady: "\u0110\u1EE7 \u0111i\u1EC1u ki\u1EC7n xu\u1EA5t b\u1EA3n",
    statusWaiting: "\u0110ang ch\u1EDD duy\u1EC7t",
    severityInfo: "Th\xF4ng tin",
    severityWarning: "C\u1EA3nh b\xE1o",
    stepDeparture: "Th\xEAm v\xE0 ch\u1ECDn l\u1ECBch kh\u1EDFi h\xE0nh",
    stepHero: "Nh\u1EADp \u1EA3nh hero public",
    stepPublish: "Preview r\u1ED3i xu\u1EA5t b\u1EA3n",
    stepSave: "L\u01B0u thay \u0111\u1ED5i tour",
    stepTitle: "C\xE1c b\u01B0\u1EDBc c\u1EA7n l\xE0m",
    stepWrapper: "T\u1EA1o wrapper \u0111\xFAng \u0111\u01B0\u1EDDng d\u1EABn",
    wrapper: "Wrapper",
    wrapperPath: "\u0110\u01B0\u1EDDng d\u1EABn hi\u1EC7n t\u1EA1i"
  }
};
const getErrorBody = async (response) => response.json().catch(() => ({}));
const healthLabel = (wrapper, copy) => {
  if (!wrapper?.health) return "\u2014";
  if (wrapper.health === "valid") return copy.healthValid;
  if (wrapper.health === "shared") return copy.healthShared;
  if (wrapper.health === "orphan") return copy.healthOrphan;
  return wrapper.health === "invalid_site" ? copy.healthInvalidSite : copy.healthInvalidPath;
};
const issueGuidance = (issue, copy) => {
  switch (issue.code) {
    case "invalid_slug":
      return { action: "slug", detail: copy.issueInvalidSlugDetail, title: copy.issueInvalidSlugTitle };
    case "missing_title":
      return { action: "title", detail: copy.issueMissingTitleDetail, title: copy.issueMissingTitleTitle };
    case "missing_hero_media":
      return { action: "hero", detail: copy.issueMissingHeroMediaDetail, title: copy.issueMissingHeroMediaTitle };
    case "missing_wrapper":
      return { action: "provision", detail: copy.issueMissingWrapperDetail, title: copy.issueMissingWrapperTitle };
    case "invalid_wrapper":
      return { action: "provision", detail: copy.issueInvalidWrapperDetail, title: copy.issueInvalidWrapperTitle };
    case "invalid_wrapper_site":
      return { action: "candidates", detail: copy.issueInvalidSiteDetail, title: copy.issueInvalidSiteTitle };
    case "orphan_wrapper":
      return { action: "candidates", detail: copy.issueOrphanWrapperDetail, title: copy.issueOrphanWrapperTitle };
    case "shared_wrapper":
      return { action: "candidates", detail: copy.issueSharedWrapperDetail, title: copy.issueSharedWrapperTitle };
    case "no_departures":
      return { action: "departures", detail: copy.issueNoDeparturesDetail, title: copy.issueNoDeparturesTitle };
    case "editor_cannot_publish":
      return { detail: copy.issueEditorDetail, title: copy.issueEditorTitle };
    default:
      return { detail: copy.issueDefaultDetail, title: copy.issueDefaultTitle };
  }
};
const severityLabel = (severity, copy) => {
  if (severity === "error") return copy.statusBlocked;
  if (severity === "warning") return copy.severityWarning;
  return copy.severityInfo;
};
const errorHelp = (code, copy) => {
  if (code === "wrapper_forbidden") return copy.issueEditorDetail;
  if (code === "stale_revision") return copy.revisionConflict;
  if (code === "path_occupied") return copy.issueInvalidWrapperDetail;
  return copy.actionHint;
};
const scrollToElement = (target) => {
  const element = document.getElementById(target) || document.querySelector(`[name="${target}"]`);
  if (!(element instanceof HTMLElement)) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  if (element.tabIndex < 0) element.tabIndex = -1;
  element.focus({ preventScroll: true });
};
export default function TourAuthoringReadiness({ departureRevision = 0 }) {
  const { id } = useDocumentInfo();
  const { code: locale } = useLocale();
  const reportUpdate = typeof PayloadUI.useDocumentEvents === "function" ? PayloadUI.useDocumentEvents()?.reportUpdate : void 0;
  const contextKey = `${id}:${locale}`;
  const currentContext = useRef(contextKey);
  const contextVersion = useRef(0);
  if (currentContext.current !== contextKey) {
    currentContext.current = contextKey;
    contextVersion.current += 1;
  }
  const generation = contextVersion.current;
  const copy = locale === "en" ? copyByLocale.en : copyByLocale.vi;
  const loadFailedMessage = copy.loadFailed;
  const formModified = useFormModified();
  const [readiness, setReadiness] = useState(null);
  const [selectedDepartureIDs, setSelectedDepartureIDs] = useState(() => /* @__PURE__ */ new Set());
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const load = useCallback(async () => {
    if (id == null || id === "create") return;
    setLoading(true);
    setError("");
    setErrorCode(null);
    setHidden(false);
    const response = await fetch(`/api/tour-authoring/${encodeURIComponent(String(id))}?locale=${encodeURIComponent(locale || "vi")}`, { credentials: "include" });
    const body = await getErrorBody(response);
    if (!response.ok) {
      if (response.status === 404 && body.code === "not_wingsgo") {
        setHidden(true);
        setLoading(false);
        return;
      }
      throw Object.assign(new Error(body.message || loadFailedMessage), { code: body.code || "load_failed" });
    }
    setReadiness(body);
    setLoading(false);
  }, [id, locale, loadFailedMessage]);
  useEffect(() => {
    if (id == null || id === "create") {
      setLoading(false);
      return;
    }
    void load().catch((reason) => {
      setLoading(false);
      setErrorCode(reason.code || "load_failed");
      setError(reason.message || loadFailedMessage);
    });
  }, [departureRevision, id, load, loadFailedMessage, reloadToken]);
  const runAction = async (actionName, wrapperID) => {
    if (!readiness || formModified || busy) return;
    const requestGeneration = generation;
    const requestId = id;
    const departureIDs = readiness.departures.filter(({ id: departureID }) => selectedDepartureIDs.has(String(departureID))).map(({ id: departureID }) => departureID);
    if (actionName === "publish" && departureIDs.length === 0) return;
    if (actionName === "relink" && wrapperID == null) return;
    if (actionName === "publish" && !window.confirm(
      locale === "en" ? `Publish TourProduct #${readiness.product.id} with Page #${readiness.wrapper?.id || "\u2014"} (${readiness.wrapper?.path || readiness.product.expectedPath || "\u2014"}) and departures ${departureIDs.map((departureID) => `#${departureID}`).join(", ")}?` : `Xu\u1EA5t b\u1EA3n TourProduct #${readiness.product.id}, Page #${readiness.wrapper?.id || "\u2014"} (${readiness.wrapper?.path || readiness.product.expectedPath || "\u2014"}) v\xE0 c\xE1c l\u1ECBch ${departureIDs.map((departureID) => `#${departureID}`).join(", ")}?`
    )) return;
    setBusy(actionName);
    setError("");
    setErrorCode(null);
    try {
      const response = await fetch(`/api/tour-authoring/${encodeURIComponent(String(id))}`, {
        body: JSON.stringify({ action: actionName, departureIDs, locale: locale || "vi", revision: readiness.revision, wrapperID }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const body = await getErrorBody(response);
      if (!response.ok) {
        const code = body.code || "action_failed";
        if (contextVersion.current === requestGeneration) {
          setErrorCode(code);
          setError(code === "stale_revision" ? copy.revisionConflict : body.message || copy.actionFailed);
        }
        return;
      }
      if (contextVersion.current !== requestGeneration) return;
      setReadiness(body);
      if (requestId != null && requestId !== "create") {
        reportUpdate?.({
          entitySlug: "tour-products",
          id: requestId,
          operation: "update",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch {
      if (contextVersion.current === requestGeneration) {
        setErrorCode("action_failed");
        setError(copy.actionFailed);
      }
    } finally {
      if (contextVersion.current === requestGeneration) {
        setBusy(null);
      }
    }
  };
  if (id == null || id === "create" || hidden) return null;
  if (loading) return /* @__PURE__ */ jsx("section", { "aria-label": copy.readiness, className: "tour-authoring-readiness", children: /* @__PURE__ */ jsx("p", { children: copy.loading }) });
  if (error && !readiness) {
    return /* @__PURE__ */ jsxs("section", { "aria-label": copy.readiness, className: "tour-authoring-readiness tour-authoring-readiness--blocked", children: [
      /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__status", role: "alert", children: [
        /* @__PURE__ */ jsx("span", { className: "tour-authoring-readiness__status-icon", children: "!" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("strong", { children: copy.statusBlocked }),
          /* @__PURE__ */ jsx("p", { children: error }),
          /* @__PURE__ */ jsx("small", { children: errorHelp(errorCode, copy) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setReloadToken((value) => value + 1), children: copy.reload })
    ] });
  }
  if (!readiness) return null;
  const selectedDepartureCount = readiness.departures.filter(({ id: departureID }) => selectedDepartureIDs.has(String(departureID))).length;
  const wrapperCandidates = readiness.wrapperCandidates || [];
  const wrapperIsValid = readiness.wrapper?.health === "valid";
  const hasPrerequisiteIssues = readiness.issues.some((issue) => issue.code !== "editor_cannot_publish");
  const statusTone = formModified || hasPrerequisiteIssues ? "blocked" : readiness.canPublish ? "ready" : "waiting";
  const statusLabel = statusTone === "ready" ? copy.statusReady : statusTone === "waiting" ? copy.statusWaiting : copy.statusBlocked;
  const statusDescription = formModified ? copy.actionBlocked : statusTone === "ready" ? copy.publishReady : statusTone === "waiting" ? copy.publishWaiting : copy.publishBlocked;
  const previewHref = readiness.wrapper ? `/next/preview?${new URLSearchParams({ collection: "pages", id: String(readiness.wrapper.id), locale: locale || "vi", path: readiness.wrapper.path || readiness.product.expectedPath || "/" }).toString()}` : null;
  const publishDisabledReason = formModified ? copy.actionBlocked : !readiness.canPublish ? copy.publishBlocked : selectedDepartureCount === 0 ? copy.selectDeparture : null;
  const steps = [
    { label: copy.stepSave, state: formModified ? "current" : "done" },
    { label: copy.stepHero, state: readiness.product.hasHeroMedia ? "done" : "current" },
    { label: copy.stepWrapper, state: wrapperIsValid ? "done" : "current" },
    { label: copy.stepDeparture, state: readiness.departures.length > 0 && selectedDepartureCount > 0 ? "done" : "current" },
    { label: copy.stepPublish, state: readiness.canPublish && selectedDepartureCount > 0 ? "done" : "current" }
  ];
  const handleIssueAction = (action) => {
    if (action === "provision") return void runAction("provision");
    if (action === "candidates") return scrollToElement("tour-authoring-candidates");
    if (action === "departures") return scrollToElement("tour-departures");
    if (action === "hero") return scrollToElement("field-heroMedia");
    if (action === "slug") return scrollToElement("field-slug");
    if (action === "title") return scrollToElement("field-title");
  };
  return /* @__PURE__ */ jsxs("section", { "aria-busy": busy !== null || loading, "aria-label": copy.readiness, className: `tour-authoring-readiness tour-authoring-readiness--${statusTone}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__status", children: [
      /* @__PURE__ */ jsx("span", { className: "tour-authoring-readiness__status-icon", "aria-hidden": "true", children: statusTone === "ready" ? "\u2713" : statusTone === "waiting" ? "\u25F7" : "!" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: statusLabel }),
        /* @__PURE__ */ jsx("p", { children: statusDescription })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__steps", "aria-label": copy.stepTitle, children: [
      /* @__PURE__ */ jsx("strong", { children: copy.stepTitle }),
      /* @__PURE__ */ jsx("ol", { children: steps.map((step, index) => /* @__PURE__ */ jsxs("li", { className: `tour-authoring-readiness__step tour-authoring-readiness__step--${step.state}`, "aria-current": step.state === "current" ? "step" : void 0, children: [
        /* @__PURE__ */ jsx("span", { children: index + 1 }),
        step.label
      ] }, step.label)) })
    ] }),
    /* @__PURE__ */ jsxs("dl", { className: "tour-authoring-readiness__facts", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { children: copy.expectedPath }),
        /* @__PURE__ */ jsx("dd", { children: readiness.product.expectedPath || "\u2014" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { children: copy.status }),
        /* @__PURE__ */ jsx("dd", { children: readiness.product.status || "draft" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { children: copy.wrapper }),
        /* @__PURE__ */ jsxs("dd", { children: [
          "#",
          readiness.wrapper?.id || "\u2014"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { children: copy.wrapperPath }),
        /* @__PURE__ */ jsx("dd", { children: readiness.wrapper?.path || copy.noWrapper })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { children: copy.health }),
        /* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx("span", { className: `tour-authoring-readiness__health tour-authoring-readiness__health--${readiness.wrapper?.health || "missing"}`, children: healthLabel(readiness.wrapper, copy) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { children: copy.heroMedia }),
        /* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx("span", { className: `tour-authoring-readiness__health tour-authoring-readiness__health--${readiness.product.hasHeroMedia ? "valid" : "missing"}`, children: readiness.product.hasHeroMedia ? copy.heroReady : copy.heroMissing }) })
      ] })
    ] }),
    readiness.wrapper && /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__links", children: [
      /* @__PURE__ */ jsx("a", { href: `/admin/collections/pages/${encodeURIComponent(String(readiness.wrapper.id))}`, children: copy.openCms }),
      previewHref && /* @__PURE__ */ jsx("a", { href: previewHref, children: copy.draftPreview }),
      readiness.wrapper.status === "published" && readiness.wrapper.path && /* @__PURE__ */ jsx("a", { href: readiness.wrapper.path, children: copy.openPublic })
    ] }),
    readiness.issues.length > 0 && /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__issues", "aria-live": "polite", children: [
      /* @__PURE__ */ jsx("strong", { children: copy.actionHint }),
      readiness.issues.map((issue) => {
        const guidance = issueGuidance(issue, copy);
        const action = issue.code === "missing_wrapper" && wrapperCandidates.length > 0 ? "candidates" : guidance.action === "candidates" && wrapperCandidates.length === 0 ? "provision" : guidance.action;
        return /* @__PURE__ */ jsxs("article", { className: `tour-authoring-readiness__issue tour-authoring-readiness__issue--${issue.severity}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__issue-heading", children: [
            /* @__PURE__ */ jsx("span", { children: severityLabel(issue.severity, copy) }),
            /* @__PURE__ */ jsx("strong", { children: guidance.title })
          ] }),
          /* @__PURE__ */ jsx("p", { children: issue.message }),
          /* @__PURE__ */ jsx("small", { children: guidance.detail }),
          action && /* @__PURE__ */ jsx("button", { disabled: busy !== null || formModified, type: "button", onClick: () => handleIssueAction(action), children: action === "provision" ? readiness.wrapper ? copy.provisionInvalid : copy.provision : action === "candidates" ? copy.candidate : action === "departures" ? copy.addDeparture : action === "slug" ? copy.fixSlug : copy.fixTitle })
        ] }, `${issue.code}-${issue.message}`);
      })
    ] }),
    !wrapperIsValid && wrapperCandidates.length > 0 && /* @__PURE__ */ jsxs("fieldset", { className: "tour-authoring-readiness__candidates", disabled: busy !== null || formModified, id: "tour-authoring-candidates", children: [
      /* @__PURE__ */ jsx("legend", { children: copy.candidate }),
      /* @__PURE__ */ jsx("p", { children: copy.candidatesHelp }),
      wrapperCandidates.map((candidate) => /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__candidate", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsxs("b", { children: [
            "#",
            candidate.id
          ] }),
          " \xB7 ",
          candidate.path,
          " \xB7 ",
          candidate.status || "draft",
          " \xB7 ",
          healthLabel(candidate, copy)
        ] }),
        (candidate.health === "valid" || candidate.health === "orphan") && /* @__PURE__ */ jsx("button", { type: "button", onClick: () => void runAction("relink", candidate.id), children: busy === "relink" ? `${copy.relink}\u2026` : copy.relink })
      ] }, candidate.id))
    ] }),
    /* @__PURE__ */ jsxs("fieldset", { className: "tour-authoring-readiness__departures", disabled: busy !== null, id: "tour-authoring-publish-departures", children: [
      /* @__PURE__ */ jsx("legend", { children: copy.departure }),
      /* @__PURE__ */ jsx("p", { children: copy.departureHelp }),
      readiness.departures.map((departure) => /* @__PURE__ */ jsxs("label", { children: [
        /* @__PURE__ */ jsx("input", { "aria-label": `${copy.departure} #${departure.id}`, checked: selectedDepartureIDs.has(String(departure.id)), onChange: () => setSelectedDepartureIDs((current) => {
          const next = new Set(current);
          const key = String(departure.id);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        }), type: "checkbox" }),
        " ",
        /* @__PURE__ */ jsxs("span", { children: [
          "#",
          departure.id
        ] }),
        " ",
        /* @__PURE__ */ jsx("small", { children: departure.status || "\u2014" })
      ] }, departure.id)),
      !readiness.departures.length && /* @__PURE__ */ jsx("span", { className: "tour-authoring-readiness__empty", children: copy.issueNoDeparturesTitle })
    ] }),
    formModified && /* @__PURE__ */ jsx("p", { className: "tour-authoring-readiness__inline-warning", role: "status", children: copy.actionBlocked }),
    error && /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__error", role: "alert", children: [
      /* @__PURE__ */ jsx("strong", { children: copy.statusBlocked }),
      /* @__PURE__ */ jsx("p", { children: error }),
      /* @__PURE__ */ jsx("small", { children: errorHelp(errorCode, copy) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__actions", children: [
      (!readiness.wrapper || !wrapperIsValid) && /* @__PURE__ */ jsx("button", { disabled: formModified || busy !== null, type: "button", onClick: () => void runAction("provision"), children: busy === "provision" ? `${readiness.wrapper ? copy.provisionInvalid : copy.provision}\u2026` : readiness.wrapper ? copy.provisionInvalid : copy.provision }),
      /* @__PURE__ */ jsxs("div", { className: "tour-authoring-readiness__publish-action", children: [
        /* @__PURE__ */ jsx("button", { "aria-describedby": publishDisabledReason ? "tour-authoring-publish-hint" : void 0, className: "tour-authoring-readiness__publish-button", disabled: formModified || busy !== null || !readiness.canPublish || selectedDepartureCount === 0, type: "button", onClick: () => void runAction("publish"), children: busy === "publish" ? "\u2026" : copy.publish }),
        publishDisabledReason && /* @__PURE__ */ jsx("small", { id: "tour-authoring-publish-hint", children: publishDisabledReason })
      ] })
    ] })
  ] });
}
