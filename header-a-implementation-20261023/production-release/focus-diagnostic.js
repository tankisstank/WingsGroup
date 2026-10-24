window.__us085FocusEvents = [];
for (const type of ['focusin', 'focusout']) {
  document.addEventListener(type, event => {
    if (window.__us085FocusEvents.length < 60) {
      window.__us085FocusEvents.push({type, tag:event.target.tagName, name:event.target.getAttribute('name'), id:event.target.id, time:performance.now(), url:location.href});
    }
  });
}
const originalFocus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = function(...args) {
  window.__us085FocusEvents.push({type:'focus-call',tag:this.tagName,name:this.getAttribute('name'),id:this.id,time:performance.now(),stack:new Error().stack});
  return originalFocus.apply(this,args);
};
sessionStorage.setItem('wingsgroup-inquiry-context','outbound');
true
