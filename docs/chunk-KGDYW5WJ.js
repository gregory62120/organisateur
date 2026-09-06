import{b as O,c as lt,f as St,h as be}from"./chunk-6QQ5V24U.js";import{a as De}from"./chunk-WNOD27M2.js";import"./chunk-QONZUI63.js";import{A as Mt,B as Nt,C as he,D as Bt,E as J,G as _e,K as Et,L as fe,M as ge,N as ve,O as ye,g as kt,i as me,j as ct,n as ue,q as Ot,s as At,t as pe,u as Z,v as Lt}from"./chunk-VBQQLJAL.js";import{$a as A,Ab as x,Bb as $,Cb as h,Da as d,Db as Y,Eb as F,Fb as Pt,Ha as rt,Hb as Ct,Ib as wt,Jb as xt,Ka as j,Kb as le,L as _t,Ma as se,N as I,Na as Ft,Ra as _,S as z,Ta as ot,V as N,Va as st,Vb as P,W as ft,Wa as de,X as s,Xb as X,Yb as ce,a as nt,aa as y,ab as K,ba as D,bb as G,ca as gt,d as bt,da as Tt,db as W,ea as it,eb as q,fa as Rt,fb as w,g as L,gb as l,hb as c,ia as m,ib as V,ja as H,jb as f,kb as g,lb as T,mb as dt,na as p,nb as U,ob as v,pa as vt,pb as yt,qb as u,rb as Q,sa as M,sb as R,ub as B,vb as S,wb as E,zb as Dt}from"./chunk-YG5W26E6.js";var Ne=["mat-icon-button",""],Be=["*"],Ye=new N("MAT_BUTTON_CONFIG");function Ce(i){return i==null?void 0:ce(i)}var Yt=(()=>{class i{_elementRef=s(M);_ngZone=s(H);_animationsDisabled=ct();_config=s(Ye,{optional:!0});_focusMonitor=s(At);_cleanupClick;_renderer=s(j);_rippleLoader=s(be);_isAnchor;_isFab=!1;color;get disableRipple(){return this._disableRipple}set disableRipple(t){this._disableRipple=t,this._updateRippleDisabled()}_disableRipple=!1;get disabled(){return this._disabled}set disabled(t){this._disabled=t,this._updateRippleDisabled()}_disabled=!1;ariaDisabled;disabledInteractive;tabIndex;set _tabindex(t){this.tabIndex=t}constructor(){s(Z).load(St);let t=this._elementRef.nativeElement;this._isAnchor=t.tagName==="A",this.disabledInteractive=this._config?.disabledInteractive??!1,this.color=this._config?.color??null,this._rippleLoader?.configureRipple(t,{className:"mat-mdc-button-ripple"})}ngAfterViewInit(){this._focusMonitor.monitor(this._elementRef,!0),this._isAnchor&&this._setupAsAnchor()}ngOnDestroy(){this._cleanupClick?.(),this._focusMonitor.stopMonitoring(this._elementRef),this._rippleLoader?.destroyRipple(this._elementRef.nativeElement)}focus(t="program",e){t?this._focusMonitor.focusVia(this._elementRef.nativeElement,t,e):this._elementRef.nativeElement.focus(e)}_getAriaDisabled(){return this.ariaDisabled!=null?this.ariaDisabled:this._isAnchor?this.disabled||null:this.disabled&&this.disabledInteractive?!0:null}_getDisabledAttribute(){return this.disabledInteractive||!this.disabled?null:!0}_updateRippleDisabled(){this._rippleLoader?.setDisabled(this._elementRef.nativeElement,this.disableRipple||this.disabled)}_getTabIndex(){return this._isAnchor?this.disabled&&!this.disabledInteractive?-1:this.tabIndex:this.tabIndex}_setupAsAnchor(){this._cleanupClick=this._ngZone.runOutsideAngular(()=>this._renderer.listen(this._elementRef.nativeElement,"click",t=>{this.disabled&&(t.preventDefault(),t.stopImmediatePropagation())}))}static \u0275fac=function(e){return new(e||i)};static \u0275dir=ot({type:i,hostAttrs:[1,"mat-mdc-button-base"],hostVars:13,hostBindings:function(e,a){e&2&&(A("disabled",a._getDisabledAttribute())("aria-disabled",a._getAriaDisabled())("tabindex",a._getTabIndex()),$(a.color?"mat-"+a.color:""),x("mat-mdc-button-disabled",a.disabled)("mat-mdc-button-disabled-interactive",a.disabledInteractive)("mat-unthemed",!a.color)("_mat-animation-noopable",a._animationsDisabled))},inputs:{color:"color",disableRipple:[2,"disableRipple","disableRipple",X],disabled:[2,"disabled","disabled",X],ariaDisabled:[2,"aria-disabled","ariaDisabled",X],disabledInteractive:[2,"disabledInteractive","disabledInteractive",X],tabIndex:[2,"tabIndex","tabIndex",Ce],_tabindex:[2,"tabindex","_tabindex",Ce]}})}return i})(),zt=(()=>{class i extends Yt{constructor(){super(),this._rippleLoader.configureRipple(this._elementRef.nativeElement,{centered:!0})}static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["button","mat-icon-button",""],["a","mat-icon-button",""],["button","matIconButton",""],["a","matIconButton",""]],hostAttrs:[1,"mdc-icon-button","mat-mdc-icon-button"],exportAs:["matButton","matAnchor"],features:[st],attrs:Ne,ngContentSelectors:Be,decls:4,vars:0,consts:[[1,"mat-mdc-button-persistent-ripple","mdc-icon-button__ripple"],[1,"mat-focus-indicator"],[1,"mat-mdc-button-touch-target"]],template:function(e,a){e&1&&(Q(),T(0,"span",0),R(1),T(2,"span",1)(3,"span",2))},styles:[`.mat-mdc-icon-button {
  -webkit-user-select: none;
  user-select: none;
  display: inline-block;
  position: relative;
  box-sizing: border-box;
  border: none;
  outline: none;
  background-color: transparent;
  fill: currentColor;
  text-decoration: none;
  cursor: pointer;
  z-index: 0;
  overflow: visible;
  border-radius: var(--mat-icon-button-container-shape, var(--mat-sys-corner-full, 50%));
  flex-shrink: 0;
  text-align: center;
  width: var(--mat-icon-button-state-layer-size, 40px);
  height: var(--mat-icon-button-state-layer-size, 40px);
  padding: calc(calc(var(--mat-icon-button-state-layer-size, 40px) - var(--mat-icon-button-icon-size, 24px)) / 2);
  font-size: var(--mat-icon-button-icon-size, 24px);
  color: var(--mat-icon-button-icon-color, var(--mat-sys-on-surface-variant));
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-icon-button .mat-mdc-button-ripple,
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple,
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple::before {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}
.mat-mdc-icon-button .mat-mdc-button-ripple {
  overflow: hidden;
}
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple::before {
  content: "";
  opacity: 0;
}
.mat-mdc-icon-button .mdc-button__label,
.mat-mdc-icon-button .mat-icon {
  z-index: 1;
  position: relative;
}
.mat-mdc-icon-button .mat-focus-indicator {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  border-radius: inherit;
}
.mat-mdc-icon-button:focus-visible > .mat-focus-indicator::before {
  content: "";
  border-radius: inherit;
}
.mat-mdc-icon-button .mat-ripple-element {
  background-color: var(--mat-icon-button-ripple-color, color-mix(in srgb, var(--mat-sys-on-surface-variant) calc(var(--mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-icon-button-state-layer-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-icon-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-icon-button-disabled-state-layer-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-icon-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-icon-button-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mat-mdc-icon-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-icon-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-icon-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-icon-button-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
}
.mat-mdc-icon-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-icon-button-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-icon-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--mat-icon-button-touch-target-size, 48px);
  display: var(--mat-icon-button-touch-target-display, block);
  left: 50%;
  width: var(--mat-icon-button-touch-target-size, 48px);
  transform: translate(-50%, -50%);
}
.mat-mdc-icon-button._mat-animation-noopable {
  transition: none !important;
  animation: none !important;
}
.mat-mdc-icon-button[disabled], .mat-mdc-icon-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--mat-icon-button-disabled-icon-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-icon-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}
.mat-mdc-icon-button img,
.mat-mdc-icon-button svg {
  width: var(--mat-icon-button-icon-size, 24px);
  height: var(--mat-icon-button-icon-size, 24px);
  vertical-align: baseline;
}
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple {
  border-radius: var(--mat-icon-button-container-shape, var(--mat-sys-corner-full, 50%));
}
.mat-mdc-icon-button[hidden] {
  display: none;
}
.mat-mdc-icon-button.mat-unthemed:not(.mdc-ripple-upgraded):focus::before, .mat-mdc-icon-button.mat-primary:not(.mdc-ripple-upgraded):focus::before, .mat-mdc-icon-button.mat-accent:not(.mdc-ripple-upgraded):focus::before, .mat-mdc-icon-button.mat-warn:not(.mdc-ripple-upgraded):focus::before {
  background: transparent;
  opacity: 1;
}
`,`@media (forced-colors: active) {
  .mat-mdc-button:not(.mdc-button--outlined),
  .mat-mdc-unelevated-button:not(.mdc-button--outlined),
  .mat-mdc-raised-button:not(.mdc-button--outlined),
  .mat-mdc-outlined-button:not(.mdc-button--outlined),
  .mat-mdc-button-base.mat-tonal-button,
  .mat-mdc-icon-button.mat-mdc-icon-button,
  .mat-mdc-outlined-button .mdc-button__ripple {
    outline: solid 1px;
  }
}
`],encapsulation:2,changeDetection:0})}return i})();var je=["matButton",""],Ke=[[["",8,"material-icons",3,"iconPositionEnd",""],["mat-icon",3,"iconPositionEnd",""],["","matButtonIcon","",3,"iconPositionEnd",""]],"*",[["","iconPositionEnd","",8,"material-icons"],["mat-icon","iconPositionEnd",""],["","matButtonIcon","","iconPositionEnd",""]]],Ge=[".material-icons:not([iconPositionEnd]), mat-icon:not([iconPositionEnd]), [matButtonIcon]:not([iconPositionEnd])","*",".material-icons[iconPositionEnd], mat-icon[iconPositionEnd], [matButtonIcon][iconPositionEnd]"];var we=new Map([["text",["mat-mdc-button"]],["filled",["mdc-button--unelevated","mat-mdc-unelevated-button"]],["elevated",["mdc-button--raised","mat-mdc-raised-button"]],["outlined",["mdc-button--outlined","mat-mdc-outlined-button"]],["tonal",["mat-tonal-button"]]]),xe=(()=>{class i extends Yt{get appearance(){return this._appearance}set appearance(t){this.setAppearance(t||this._config?.defaultAppearance||"text")}_appearance=null;constructor(){super();let t=We(this._elementRef.nativeElement);t&&this.setAppearance(t)}setAppearance(t){if(t===this._appearance)return;let e=this._elementRef.nativeElement.classList,a=this._appearance?we.get(this._appearance):null,n=we.get(t);a&&e.remove(...a),e.add(...n),this._appearance=t}static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["button","matButton",""],["a","matButton",""],["button","mat-button",""],["button","mat-raised-button",""],["button","mat-flat-button",""],["button","mat-stroked-button",""],["a","mat-button",""],["a","mat-raised-button",""],["a","mat-flat-button",""],["a","mat-stroked-button",""]],hostAttrs:[1,"mdc-button"],inputs:{appearance:[0,"matButton","appearance"]},exportAs:["matButton","matAnchor"],features:[st],attrs:je,ngContentSelectors:Ge,decls:7,vars:4,consts:[[1,"mat-mdc-button-persistent-ripple"],[1,"mdc-button__label"],[1,"mat-focus-indicator"],[1,"mat-mdc-button-touch-target"]],template:function(e,a){e&1&&(Q(Ke),T(0,"span",0),R(1),f(2,"span",1),R(3,1),g(),R(4,2),T(5,"span",2)(6,"span",3)),e&2&&x("mdc-button__ripple",!a._isFab)("mdc-fab__ripple",a._isFab)},styles:[`.mat-mdc-button-base {
  text-decoration: none;
}
.mat-mdc-button-base .mat-icon {
  min-height: fit-content;
  flex-shrink: 0;
}
@media (hover: none) {
  .mat-mdc-button-base:hover > span.mat-mdc-button-persistent-ripple::before {
    opacity: 0;
  }
}

.mdc-button {
  -webkit-user-select: none;
  user-select: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 64px;
  border: none;
  outline: none;
  line-height: inherit;
  -webkit-appearance: none;
  overflow: visible;
  vertical-align: middle;
  background: transparent;
  padding: 0 8px;
}
.mdc-button::-moz-focus-inner {
  padding: 0;
  border: 0;
}
.mdc-button:active {
  outline: none;
}
.mdc-button:hover {
  cursor: pointer;
}
.mdc-button:disabled {
  cursor: default;
  pointer-events: none;
}
.mdc-button[hidden] {
  display: none;
}
.mdc-button .mdc-button__label {
  position: relative;
}

.mat-mdc-button {
  padding: 0 var(--mat-button-text-horizontal-padding, 12px);
  height: var(--mat-button-text-container-height, 40px);
  font-family: var(--mat-button-text-label-text-font, var(--mat-sys-label-large-font));
  font-size: var(--mat-button-text-label-text-size, var(--mat-sys-label-large-size));
  letter-spacing: var(--mat-button-text-label-text-tracking, var(--mat-sys-label-large-tracking));
  text-transform: var(--mat-button-text-label-text-transform);
  font-weight: var(--mat-button-text-label-text-weight, var(--mat-sys-label-large-weight));
}
.mat-mdc-button, .mat-mdc-button .mdc-button__ripple {
  border-radius: var(--mat-button-text-container-shape, var(--mat-sys-corner-full));
}
.mat-mdc-button:not(:disabled) {
  color: var(--mat-button-text-label-text-color, var(--mat-sys-primary));
}
.mat-mdc-button[disabled], .mat-mdc-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--mat-button-text-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}
.mat-mdc-button:has(.material-icons, mat-icon, [matButtonIcon]) {
  padding: 0 var(--mat-button-text-with-icon-horizontal-padding, 16px);
}
.mat-mdc-button > .mat-icon {
  margin-right: var(--mat-button-text-icon-spacing, 8px);
  margin-left: var(--mat-button-text-icon-offset, -4px);
}
[dir=rtl] .mat-mdc-button > .mat-icon {
  margin-right: var(--mat-button-text-icon-offset, -4px);
  margin-left: var(--mat-button-text-icon-spacing, 8px);
}
.mat-mdc-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-text-icon-offset, -4px);
  margin-left: var(--mat-button-text-icon-spacing, 8px);
}
[dir=rtl] .mat-mdc-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-text-icon-spacing, 8px);
  margin-left: var(--mat-button-text-icon-offset, -4px);
}
.mat-mdc-button .mat-ripple-element {
  background-color: var(--mat-button-text-ripple-color, color-mix(in srgb, var(--mat-sys-primary) calc(var(--mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-text-state-layer-color, var(--mat-sys-primary));
}
.mat-mdc-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-text-disabled-state-layer-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-text-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mat-mdc-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-text-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
}
.mat-mdc-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-text-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--mat-button-text-touch-target-size, 48px);
  display: var(--mat-button-text-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}

.mat-mdc-unelevated-button {
  transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
  height: var(--mat-button-filled-container-height, 40px);
  font-family: var(--mat-button-filled-label-text-font, var(--mat-sys-label-large-font));
  font-size: var(--mat-button-filled-label-text-size, var(--mat-sys-label-large-size));
  letter-spacing: var(--mat-button-filled-label-text-tracking, var(--mat-sys-label-large-tracking));
  text-transform: var(--mat-button-filled-label-text-transform);
  font-weight: var(--mat-button-filled-label-text-weight, var(--mat-sys-label-large-weight));
  padding: 0 var(--mat-button-filled-horizontal-padding, 24px);
}
.mat-mdc-unelevated-button > .mat-icon {
  margin-right: var(--mat-button-filled-icon-spacing, 8px);
  margin-left: var(--mat-button-filled-icon-offset, -8px);
}
[dir=rtl] .mat-mdc-unelevated-button > .mat-icon {
  margin-right: var(--mat-button-filled-icon-offset, -8px);
  margin-left: var(--mat-button-filled-icon-spacing, 8px);
}
.mat-mdc-unelevated-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-filled-icon-offset, -8px);
  margin-left: var(--mat-button-filled-icon-spacing, 8px);
}
[dir=rtl] .mat-mdc-unelevated-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-filled-icon-spacing, 8px);
  margin-left: var(--mat-button-filled-icon-offset, -8px);
}
.mat-mdc-unelevated-button .mat-ripple-element {
  background-color: var(--mat-button-filled-ripple-color, color-mix(in srgb, var(--mat-sys-on-primary) calc(var(--mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-unelevated-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-filled-state-layer-color, var(--mat-sys-on-primary));
}
.mat-mdc-unelevated-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-filled-disabled-state-layer-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-unelevated-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-filled-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mat-mdc-unelevated-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-unelevated-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-unelevated-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-filled-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
}
.mat-mdc-unelevated-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-filled-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-unelevated-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--mat-button-filled-touch-target-size, 48px);
  display: var(--mat-button-filled-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}
.mat-mdc-unelevated-button:not(:disabled) {
  color: var(--mat-button-filled-label-text-color, var(--mat-sys-on-primary));
  background-color: var(--mat-button-filled-container-color, var(--mat-sys-primary));
}
.mat-mdc-unelevated-button, .mat-mdc-unelevated-button .mdc-button__ripple {
  border-radius: var(--mat-button-filled-container-shape, var(--mat-sys-corner-full));
}
.mat-mdc-unelevated-button[disabled], .mat-mdc-unelevated-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--mat-button-filled-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
  background-color: var(--mat-button-filled-disabled-container-color, color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent));
}
.mat-mdc-unelevated-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}

.mat-mdc-raised-button {
  transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--mat-button-protected-container-elevation-shadow, var(--mat-sys-level1));
  height: var(--mat-button-protected-container-height, 40px);
  font-family: var(--mat-button-protected-label-text-font, var(--mat-sys-label-large-font));
  font-size: var(--mat-button-protected-label-text-size, var(--mat-sys-label-large-size));
  letter-spacing: var(--mat-button-protected-label-text-tracking, var(--mat-sys-label-large-tracking));
  text-transform: var(--mat-button-protected-label-text-transform);
  font-weight: var(--mat-button-protected-label-text-weight, var(--mat-sys-label-large-weight));
  padding: 0 var(--mat-button-protected-horizontal-padding, 24px);
}
.mat-mdc-raised-button > .mat-icon {
  margin-right: var(--mat-button-protected-icon-spacing, 8px);
  margin-left: var(--mat-button-protected-icon-offset, -8px);
}
[dir=rtl] .mat-mdc-raised-button > .mat-icon {
  margin-right: var(--mat-button-protected-icon-offset, -8px);
  margin-left: var(--mat-button-protected-icon-spacing, 8px);
}
.mat-mdc-raised-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-protected-icon-offset, -8px);
  margin-left: var(--mat-button-protected-icon-spacing, 8px);
}
[dir=rtl] .mat-mdc-raised-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-protected-icon-spacing, 8px);
  margin-left: var(--mat-button-protected-icon-offset, -8px);
}
.mat-mdc-raised-button .mat-ripple-element {
  background-color: var(--mat-button-protected-ripple-color, color-mix(in srgb, var(--mat-sys-primary) calc(var(--mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-raised-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-protected-state-layer-color, var(--mat-sys-primary));
}
.mat-mdc-raised-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-protected-disabled-state-layer-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-raised-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-protected-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mat-mdc-raised-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-raised-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-raised-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-protected-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
}
.mat-mdc-raised-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-protected-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-raised-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--mat-button-protected-touch-target-size, 48px);
  display: var(--mat-button-protected-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}
.mat-mdc-raised-button:not(:disabled) {
  color: var(--mat-button-protected-label-text-color, var(--mat-sys-primary));
  background-color: var(--mat-button-protected-container-color, var(--mat-sys-surface));
}
.mat-mdc-raised-button, .mat-mdc-raised-button .mdc-button__ripple {
  border-radius: var(--mat-button-protected-container-shape, var(--mat-sys-corner-full));
}
@media (hover: hover) {
  .mat-mdc-raised-button:hover {
    box-shadow: var(--mat-button-protected-hover-container-elevation-shadow, var(--mat-sys-level2));
  }
}
.mat-mdc-raised-button:focus {
  box-shadow: var(--mat-button-protected-focus-container-elevation-shadow, var(--mat-sys-level1));
}
.mat-mdc-raised-button:active, .mat-mdc-raised-button:focus:active {
  box-shadow: var(--mat-button-protected-pressed-container-elevation-shadow, var(--mat-sys-level1));
}
.mat-mdc-raised-button[disabled], .mat-mdc-raised-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--mat-button-protected-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
  background-color: var(--mat-button-protected-disabled-container-color, color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent));
}
.mat-mdc-raised-button[disabled].mat-mdc-button-disabled, .mat-mdc-raised-button.mat-mdc-button-disabled.mat-mdc-button-disabled {
  box-shadow: var(--mat-button-protected-disabled-container-elevation-shadow, var(--mat-sys-level0));
}
.mat-mdc-raised-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}

.mat-mdc-outlined-button {
  border-style: solid;
  transition: border 280ms cubic-bezier(0.4, 0, 0.2, 1);
  height: var(--mat-button-outlined-container-height, 40px);
  font-family: var(--mat-button-outlined-label-text-font, var(--mat-sys-label-large-font));
  font-size: var(--mat-button-outlined-label-text-size, var(--mat-sys-label-large-size));
  letter-spacing: var(--mat-button-outlined-label-text-tracking, var(--mat-sys-label-large-tracking));
  text-transform: var(--mat-button-outlined-label-text-transform);
  font-weight: var(--mat-button-outlined-label-text-weight, var(--mat-sys-label-large-weight));
  border-radius: var(--mat-button-outlined-container-shape, var(--mat-sys-corner-full));
  border-width: var(--mat-button-outlined-outline-width, 1px);
  padding: 0 var(--mat-button-outlined-horizontal-padding, 24px);
}
.mat-mdc-outlined-button > .mat-icon {
  margin-right: var(--mat-button-outlined-icon-spacing, 8px);
  margin-left: var(--mat-button-outlined-icon-offset, -8px);
}
[dir=rtl] .mat-mdc-outlined-button > .mat-icon {
  margin-right: var(--mat-button-outlined-icon-offset, -8px);
  margin-left: var(--mat-button-outlined-icon-spacing, 8px);
}
.mat-mdc-outlined-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-outlined-icon-offset, -8px);
  margin-left: var(--mat-button-outlined-icon-spacing, 8px);
}
[dir=rtl] .mat-mdc-outlined-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-outlined-icon-spacing, 8px);
  margin-left: var(--mat-button-outlined-icon-offset, -8px);
}
.mat-mdc-outlined-button .mat-ripple-element {
  background-color: var(--mat-button-outlined-ripple-color, color-mix(in srgb, var(--mat-sys-primary) calc(var(--mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-outlined-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-outlined-state-layer-color, var(--mat-sys-primary));
}
.mat-mdc-outlined-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-outlined-disabled-state-layer-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-outlined-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-outlined-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mat-mdc-outlined-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-outlined-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-outlined-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-outlined-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
}
.mat-mdc-outlined-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-outlined-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-outlined-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--mat-button-outlined-touch-target-size, 48px);
  display: var(--mat-button-outlined-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}
.mat-mdc-outlined-button:not(:disabled) {
  color: var(--mat-button-outlined-label-text-color, var(--mat-sys-primary));
  border-color: var(--mat-button-outlined-outline-color, var(--mat-sys-outline));
}
.mat-mdc-outlined-button[disabled], .mat-mdc-outlined-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--mat-button-outlined-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
  border-color: var(--mat-button-outlined-disabled-outline-color, color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent));
}
.mat-mdc-outlined-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}

.mat-tonal-button {
  transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
  height: var(--mat-button-tonal-container-height, 40px);
  font-family: var(--mat-button-tonal-label-text-font, var(--mat-sys-label-large-font));
  font-size: var(--mat-button-tonal-label-text-size, var(--mat-sys-label-large-size));
  letter-spacing: var(--mat-button-tonal-label-text-tracking, var(--mat-sys-label-large-tracking));
  text-transform: var(--mat-button-tonal-label-text-transform);
  font-weight: var(--mat-button-tonal-label-text-weight, var(--mat-sys-label-large-weight));
  padding: 0 var(--mat-button-tonal-horizontal-padding, 24px);
}
.mat-tonal-button:not(:disabled) {
  color: var(--mat-button-tonal-label-text-color, var(--mat-sys-on-secondary-container));
  background-color: var(--mat-button-tonal-container-color, var(--mat-sys-secondary-container));
}
.mat-tonal-button, .mat-tonal-button .mdc-button__ripple {
  border-radius: var(--mat-button-tonal-container-shape, var(--mat-sys-corner-full));
}
.mat-tonal-button[disabled], .mat-tonal-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--mat-button-tonal-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
  background-color: var(--mat-button-tonal-disabled-container-color, color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent));
}
.mat-tonal-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}
.mat-tonal-button > .mat-icon {
  margin-right: var(--mat-button-tonal-icon-spacing, 8px);
  margin-left: var(--mat-button-tonal-icon-offset, -8px);
}
[dir=rtl] .mat-tonal-button > .mat-icon {
  margin-right: var(--mat-button-tonal-icon-offset, -8px);
  margin-left: var(--mat-button-tonal-icon-spacing, 8px);
}
.mat-tonal-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-tonal-icon-offset, -8px);
  margin-left: var(--mat-button-tonal-icon-spacing, 8px);
}
[dir=rtl] .mat-tonal-button .mdc-button__label + .mat-icon {
  margin-right: var(--mat-button-tonal-icon-spacing, 8px);
  margin-left: var(--mat-button-tonal-icon-offset, -8px);
}
.mat-tonal-button .mat-ripple-element {
  background-color: var(--mat-button-tonal-ripple-color, color-mix(in srgb, var(--mat-sys-on-secondary-container) calc(var(--mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-tonal-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-tonal-state-layer-color, var(--mat-sys-on-secondary-container));
}
.mat-tonal-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--mat-button-tonal-disabled-state-layer-color, var(--mat-sys-on-surface-variant));
}
.mat-tonal-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-tonal-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mat-tonal-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-tonal-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-tonal-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-tonal-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
}
.mat-tonal-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--mat-button-tonal-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
}
.mat-tonal-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--mat-button-tonal-touch-target-size, 48px);
  display: var(--mat-button-tonal-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}

.mat-mdc-button,
.mat-mdc-unelevated-button,
.mat-mdc-raised-button,
.mat-mdc-outlined-button,
.mat-tonal-button {
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-button .mat-mdc-button-ripple,
.mat-mdc-button .mat-mdc-button-persistent-ripple,
.mat-mdc-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-unelevated-button .mat-mdc-button-ripple,
.mat-mdc-unelevated-button .mat-mdc-button-persistent-ripple,
.mat-mdc-unelevated-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-raised-button .mat-mdc-button-ripple,
.mat-mdc-raised-button .mat-mdc-button-persistent-ripple,
.mat-mdc-raised-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-outlined-button .mat-mdc-button-ripple,
.mat-mdc-outlined-button .mat-mdc-button-persistent-ripple,
.mat-mdc-outlined-button .mat-mdc-button-persistent-ripple::before,
.mat-tonal-button .mat-mdc-button-ripple,
.mat-tonal-button .mat-mdc-button-persistent-ripple,
.mat-tonal-button .mat-mdc-button-persistent-ripple::before {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}
.mat-mdc-button .mat-mdc-button-ripple,
.mat-mdc-unelevated-button .mat-mdc-button-ripple,
.mat-mdc-raised-button .mat-mdc-button-ripple,
.mat-mdc-outlined-button .mat-mdc-button-ripple,
.mat-tonal-button .mat-mdc-button-ripple {
  overflow: hidden;
}
.mat-mdc-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-unelevated-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-raised-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-outlined-button .mat-mdc-button-persistent-ripple::before,
.mat-tonal-button .mat-mdc-button-persistent-ripple::before {
  content: "";
  opacity: 0;
}
.mat-mdc-button .mdc-button__label,
.mat-mdc-button .mat-icon,
.mat-mdc-unelevated-button .mdc-button__label,
.mat-mdc-unelevated-button .mat-icon,
.mat-mdc-raised-button .mdc-button__label,
.mat-mdc-raised-button .mat-icon,
.mat-mdc-outlined-button .mdc-button__label,
.mat-mdc-outlined-button .mat-icon,
.mat-tonal-button .mdc-button__label,
.mat-tonal-button .mat-icon {
  z-index: 1;
  position: relative;
}
.mat-mdc-button .mat-focus-indicator,
.mat-mdc-unelevated-button .mat-focus-indicator,
.mat-mdc-raised-button .mat-focus-indicator,
.mat-mdc-outlined-button .mat-focus-indicator,
.mat-tonal-button .mat-focus-indicator {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  border-radius: inherit;
}
.mat-mdc-button:focus-visible > .mat-focus-indicator::before,
.mat-mdc-unelevated-button:focus-visible > .mat-focus-indicator::before,
.mat-mdc-raised-button:focus-visible > .mat-focus-indicator::before,
.mat-mdc-outlined-button:focus-visible > .mat-focus-indicator::before,
.mat-tonal-button:focus-visible > .mat-focus-indicator::before {
  content: "";
  border-radius: inherit;
}
.mat-mdc-button._mat-animation-noopable,
.mat-mdc-unelevated-button._mat-animation-noopable,
.mat-mdc-raised-button._mat-animation-noopable,
.mat-mdc-outlined-button._mat-animation-noopable,
.mat-tonal-button._mat-animation-noopable {
  transition: none !important;
  animation: none !important;
}
.mat-mdc-button > .mat-icon,
.mat-mdc-unelevated-button > .mat-icon,
.mat-mdc-raised-button > .mat-icon,
.mat-mdc-outlined-button > .mat-icon,
.mat-tonal-button > .mat-icon {
  display: inline-block;
  position: relative;
  vertical-align: top;
  font-size: 1.125rem;
  height: 1.125rem;
  width: 1.125rem;
}

.mat-mdc-outlined-button .mat-mdc-button-ripple,
.mat-mdc-outlined-button .mdc-button__ripple {
  top: -1px;
  left: -1px;
  bottom: -1px;
  right: -1px;
}

.mat-mdc-unelevated-button .mat-focus-indicator::before,
.mat-tonal-button .mat-focus-indicator::before,
.mat-mdc-raised-button .mat-focus-indicator::before {
  margin: calc(calc(var(--mat-focus-indicator-border-width, 3px) + 2px) * -1);
}

.mat-mdc-outlined-button .mat-focus-indicator::before {
  margin: calc(calc(var(--mat-focus-indicator-border-width, 3px) + 3px) * -1);
}
`,`@media (forced-colors: active) {
  .mat-mdc-button:not(.mdc-button--outlined),
  .mat-mdc-unelevated-button:not(.mdc-button--outlined),
  .mat-mdc-raised-button:not(.mdc-button--outlined),
  .mat-mdc-outlined-button:not(.mdc-button--outlined),
  .mat-mdc-button-base.mat-tonal-button,
  .mat-mdc-icon-button.mat-mdc-icon-button,
  .mat-mdc-outlined-button .mdc-button__ripple {
    outline: solid 1px;
  }
}
`],encapsulation:2,changeDetection:0})}return i})();function We(i){return i.hasAttribute("mat-raised-button")?"elevated":i.hasAttribute("mat-stroked-button")?"outlined":i.hasAttribute("mat-flat-button")?"filled":i.hasAttribute("mat-button")?"text":null}var qe=["tooltip"],Ue=20;var Qe=new N("mat-tooltip-scroll-strategy",{providedIn:"root",factory:()=>{let i=s(it);return()=>ge(i,{scrollThrottle:Ue})}}),$e=new N("mat-tooltip-default-options",{providedIn:"root",factory:()=>({showDelay:0,hideDelay:0,touchendHideDelay:1500})});var ke="tooltip-panel",Xe={passive:!0},Ze=8,Je=8,ta=24,ea=200,Ae=(()=>{class i{_elementRef=s(M);_ngZone=s(H);_platform=s(kt);_ariaDescriber=s(he);_focusMonitor=s(At);_dir=s(J);_injector=s(it);_viewContainerRef=s(Ft);_mediaMatcher=s(me);_document=s(Rt);_renderer=s(j);_animationsDisabled=ct();_defaultOptions=s($e,{optional:!0});_overlayRef=null;_tooltipInstance=null;_overlayPanelClass;_portal;_position="below";_positionAtOrigin=!1;_disabled=!1;_tooltipClass;_viewInitialized=!1;_pointerExitEventsInitialized=!1;_tooltipComponent=aa;_viewportMargin=8;_currentPosition;_cssClassPrefix="mat-mdc";_ariaDescriptionPending=!1;_dirSubscribed=!1;get position(){return this._position}set position(t){t!==this._position&&(this._position=t,this._overlayRef&&(this._updatePosition(this._overlayRef),this._tooltipInstance?.show(0),this._overlayRef.updatePosition()))}get positionAtOrigin(){return this._positionAtOrigin}set positionAtOrigin(t){this._positionAtOrigin=Bt(t),this._detach(),this._overlayRef=null}get disabled(){return this._disabled}set disabled(t){let e=Bt(t);this._disabled!==e&&(this._disabled=e,e?this.hide(0):this._setupPointerEnterEventsIfNeeded(),this._syncAriaDescription(this.message))}get showDelay(){return this._showDelay}set showDelay(t){this._showDelay=Ot(t)}_showDelay;get hideDelay(){return this._hideDelay}set hideDelay(t){this._hideDelay=Ot(t),this._tooltipInstance&&(this._tooltipInstance._mouseLeaveHideDelay=this._hideDelay)}_hideDelay;touchGestures="auto";get message(){return this._message}set message(t){let e=this._message;this._message=t!=null?String(t).trim():"",!this._message&&this._isTooltipVisible()?this.hide(0):(this._setupPointerEnterEventsIfNeeded(),this._updateTooltipMessage()),this._syncAriaDescription(e)}_message="";get tooltipClass(){return this._tooltipClass}set tooltipClass(t){this._tooltipClass=t,this._tooltipInstance&&this._setTooltipClass(this._tooltipClass)}_eventCleanups=[];_touchstartTimeout=null;_destroyed=new L;_isDestroyed=!1;constructor(){let t=this._defaultOptions;t&&(this._showDelay=t.showDelay,this._hideDelay=t.hideDelay,t.position&&(this.position=t.position),t.positionAtOrigin&&(this.positionAtOrigin=t.positionAtOrigin),t.touchGestures&&(this.touchGestures=t.touchGestures),t.tooltipClass&&(this.tooltipClass=t.tooltipClass)),this._viewportMargin=Ze}ngAfterViewInit(){this._viewInitialized=!0,this._setupPointerEnterEventsIfNeeded(),this._focusMonitor.monitor(this._elementRef).pipe(I(this._destroyed)).subscribe(t=>{t?t==="keyboard"&&this._ngZone.run(()=>this.show()):this._ngZone.run(()=>this.hide(0))})}ngOnDestroy(){let t=this._elementRef.nativeElement;this._touchstartTimeout&&clearTimeout(this._touchstartTimeout),this._overlayRef&&(this._overlayRef.dispose(),this._tooltipInstance=null),this._eventCleanups.forEach(e=>e()),this._eventCleanups.length=0,this._destroyed.next(),this._destroyed.complete(),this._isDestroyed=!0,this._ariaDescriber.removeDescription(t,this.message,"tooltip"),this._focusMonitor.stopMonitoring(t)}show(t=this.showDelay,e){if(this.disabled||!this.message||this._isTooltipVisible()){this._tooltipInstance?._cancelPendingAnimations();return}let a=this._createOverlay(e);this._detach(),this._portal=this._portal||new Et(this._tooltipComponent,this._viewContainerRef);let n=this._tooltipInstance=a.attach(this._portal).instance;n._triggerElement=this._elementRef.nativeElement,n._mouseLeaveHideDelay=this._hideDelay,n.afterHidden().pipe(I(this._destroyed)).subscribe(()=>this._detach()),this._setTooltipClass(this._tooltipClass),this._updateTooltipMessage(),n.show(t)}hide(t=this.hideDelay){let e=this._tooltipInstance;e&&(e.isVisible()?e.hide(t):(e._cancelPendingAnimations(),this._detach()))}toggle(t){this._isTooltipVisible()?this.hide():this.show(void 0,t)}_isTooltipVisible(){return!!this._tooltipInstance&&this._tooltipInstance.isVisible()}_createOverlay(t){if(this._overlayRef){let r=this._overlayRef.getConfig().positionStrategy;if((!this.positionAtOrigin||!t)&&r._origin instanceof M)return this._overlayRef;this._detach()}let e=this._injector.get(_e).getAncestorScrollContainers(this._elementRef),a=`${this._cssClassPrefix}-${ke}`,n=ve(this._injector,this.positionAtOrigin?t||this._elementRef:this._elementRef).withTransformOriginOn(`.${this._cssClassPrefix}-tooltip`).withFlexibleDimensions(!1).withViewportMargin(this._viewportMargin).withScrollableContainers(e).withPopoverLocation("global");return n.positionChanges.pipe(I(this._destroyed)).subscribe(r=>{this._updateCurrentPositionClass(r.connectionPair),this._tooltipInstance&&r.scrollableViewProperties.isOverlayClipped&&this._tooltipInstance.isVisible()&&this._ngZone.run(()=>this.hide(0))}),this._overlayRef=ye(this._injector,{direction:this._dir,positionStrategy:n,panelClass:this._overlayPanelClass?[...this._overlayPanelClass,a]:a,scrollStrategy:this._injector.get(Qe)(),disableAnimations:this._animationsDisabled,eventPredicate:this._overlayEventPredicate}),this._updatePosition(this._overlayRef),this._overlayRef.detachments().pipe(I(this._destroyed)).subscribe(()=>this._detach()),this._overlayRef.outsidePointerEvents().pipe(I(this._destroyed)).subscribe(()=>this._tooltipInstance?._handleBodyInteraction()),this._overlayRef.keydownEvents().pipe(I(this._destroyed)).subscribe(r=>{r.preventDefault(),r.stopPropagation(),this._ngZone.run(()=>this.hide(0))}),this._defaultOptions?.disableTooltipInteractivity&&this._overlayRef.addPanelClass(`${this._cssClassPrefix}-tooltip-panel-non-interactive`),this._dirSubscribed||(this._dirSubscribed=!0,this._dir.change.pipe(I(this._destroyed)).subscribe(()=>{this._overlayRef&&this._updatePosition(this._overlayRef)})),this._overlayRef}_detach(){this._overlayRef&&this._overlayRef.hasAttached()&&this._overlayRef.detach(),this._tooltipInstance=null}_updatePosition(t){let e=t.getConfig().positionStrategy,a=this._getOrigin(),n=this._getOverlayPosition();e.withPositions([this._addOffset(nt(nt({},a.main),n.main)),this._addOffset(nt(nt({},a.fallback),n.fallback))])}_addOffset(t){let e=Je,a=!this._dir||this._dir.value=="ltr";return t.originY==="top"?t.offsetY=-e:t.originY==="bottom"?t.offsetY=e:t.originX==="start"?t.offsetX=a?-e:e:t.originX==="end"&&(t.offsetX=a?e:-e),t}_getOrigin(){let t=!this._dir||this._dir.value=="ltr",e=this.position,a;e=="above"||e=="below"?a={originX:"center",originY:e=="above"?"top":"bottom"}:e=="before"||e=="left"&&t||e=="right"&&!t?a={originX:"start",originY:"center"}:(e=="after"||e=="right"&&t||e=="left"&&!t)&&(a={originX:"end",originY:"center"});let{x:n,y:r}=this._invertPosition(a.originX,a.originY);return{main:a,fallback:{originX:n,originY:r}}}_getOverlayPosition(){let t=!this._dir||this._dir.value=="ltr",e=this.position,a;e=="above"?a={overlayX:"center",overlayY:"bottom"}:e=="below"?a={overlayX:"center",overlayY:"top"}:e=="before"||e=="left"&&t||e=="right"&&!t?a={overlayX:"end",overlayY:"center"}:(e=="after"||e=="right"&&t||e=="left"&&!t)&&(a={overlayX:"start",overlayY:"center"});let{x:n,y:r}=this._invertPosition(a.overlayX,a.overlayY);return{main:a,fallback:{overlayX:n,overlayY:r}}}_updateTooltipMessage(){this._tooltipInstance&&(this._tooltipInstance.message=this.message,this._tooltipInstance._markForCheck(),rt(()=>{this._tooltipInstance&&this._overlayRef.updatePosition()},{injector:this._injector}))}_setTooltipClass(t){this._tooltipInstance&&(this._tooltipInstance.tooltipClass=t instanceof Set?Array.from(t):t,this._tooltipInstance._markForCheck())}_invertPosition(t,e){return this.position==="above"||this.position==="below"?e==="top"?e="bottom":e==="bottom"&&(e="top"):t==="end"?t="start":t==="start"&&(t="end"),{x:t,y:e}}_updateCurrentPositionClass(t){let{overlayY:e,originX:a,originY:n}=t,r;if(e==="center"?this._dir&&this._dir.value==="rtl"?r=a==="end"?"left":"right":r=a==="start"?"left":"right":r=e==="bottom"&&n==="top"?"above":"below",r!==this._currentPosition){let b=this._overlayRef;if(b){let ht=`${this._cssClassPrefix}-${ke}-`;b.removePanelClass(ht+this._currentPosition),b.addPanelClass(ht+r)}this._currentPosition=r}}_setupPointerEnterEventsIfNeeded(){this._disabled||!this.message||!this._viewInitialized||this._eventCleanups.length||(this._isTouchPlatform()?this.touchGestures!=="off"&&(this._disableNativeGesturesIfNecessary(),this._addListener("touchstart",t=>{let e=t.targetTouches?.[0],a=e?{x:e.clientX,y:e.clientY}:void 0;this._setupPointerExitEventsIfNeeded(),this._touchstartTimeout&&clearTimeout(this._touchstartTimeout);let n=500;this._touchstartTimeout=setTimeout(()=>{this._touchstartTimeout=null,this.show(void 0,a)},this._defaultOptions?.touchLongPressShowDelay??n)})):this._addListener("mouseenter",t=>{this._setupPointerExitEventsIfNeeded();let e;t.x!==void 0&&t.y!==void 0&&(e=t),this.show(void 0,e)}))}_setupPointerExitEventsIfNeeded(){if(!this._pointerExitEventsInitialized){if(this._pointerExitEventsInitialized=!0,!this._isTouchPlatform())this._addListener("mouseleave",t=>{let e=t.relatedTarget;(!e||!this._overlayRef?.overlayElement.contains(e))&&this.hide()}),this._addListener("wheel",t=>{if(this._isTooltipVisible()){let e=this._document.elementFromPoint(t.clientX,t.clientY),a=this._elementRef.nativeElement;e!==a&&!a.contains(e)&&this.hide()}});else if(this.touchGestures!=="off"){this._disableNativeGesturesIfNecessary();let t=()=>{this._touchstartTimeout&&clearTimeout(this._touchstartTimeout),this.hide(this._defaultOptions?.touchendHideDelay)};this._addListener("touchend",t),this._addListener("touchcancel",t)}}}_addListener(t,e){this._eventCleanups.push(this._renderer.listen(this._elementRef.nativeElement,t,e,Xe))}_isTouchPlatform(){let t=this._defaultOptions?.detectHoverCapability;return typeof t=="function"?!t():this._platform.IOS||this._platform.ANDROID?!0:this._platform.isBrowser?!!t&&this._mediaMatcher.matchMedia("(any-hover: none)").matches:!1}_disableNativeGesturesIfNecessary(){let t=this.touchGestures;if(t!=="off"){let e=this._elementRef.nativeElement,a=e.style;(t==="on"||e.nodeName!=="INPUT"&&e.nodeName!=="TEXTAREA")&&(a.userSelect=a.msUserSelect=a.webkitUserSelect=a.MozUserSelect="none"),(t==="on"||!e.draggable)&&(a.webkitUserDrag="none"),a.touchAction="none",a.webkitTapHighlightColor="transparent"}}_syncAriaDescription(t){this._ariaDescriptionPending||(this._ariaDescriptionPending=!0,this._ariaDescriber.removeDescription(this._elementRef.nativeElement,t,"tooltip"),this._isDestroyed||rt({write:()=>{this._ariaDescriptionPending=!1,this.message&&!this.disabled&&this._ariaDescriber.describe(this._elementRef.nativeElement,this.message,"tooltip")}},{injector:this._injector}))}_overlayEventPredicate=t=>t.type==="keydown"?this._isTooltipVisible()&&t.keyCode===27&&!Mt(t):!0;static \u0275fac=function(e){return new(e||i)};static \u0275dir=ot({type:i,selectors:[["","matTooltip",""]],hostAttrs:[1,"mat-mdc-tooltip-trigger"],hostVars:2,hostBindings:function(e,a){e&2&&x("mat-mdc-tooltip-disabled",a.disabled)},inputs:{position:[0,"matTooltipPosition","position"],positionAtOrigin:[0,"matTooltipPositionAtOrigin","positionAtOrigin"],disabled:[0,"matTooltipDisabled","disabled"],showDelay:[0,"matTooltipShowDelay","showDelay"],hideDelay:[0,"matTooltipHideDelay","hideDelay"],touchGestures:[0,"matTooltipTouchGestures","touchGestures"],message:[0,"matTooltip","message"],tooltipClass:[0,"matTooltipClass","tooltipClass"]},exportAs:["matTooltip"]})}return i})(),aa=(()=>{class i{_changeDetectorRef=s(P);_elementRef=s(M);_isMultiline=!1;message;tooltipClass;_showTimeoutId;_hideTimeoutId;_triggerElement;_mouseLeaveHideDelay;_animationsDisabled=ct();_tooltip;_closeOnInteraction=!1;_isVisible=!1;_onHide=new L;_showAnimation="mat-mdc-tooltip-show";_hideAnimation="mat-mdc-tooltip-hide";constructor(){}show(t){this._hideTimeoutId!=null&&clearTimeout(this._hideTimeoutId),this._showTimeoutId=setTimeout(()=>{this._toggleVisibility(!0),this._showTimeoutId=void 0},t)}hide(t){this._showTimeoutId!=null&&clearTimeout(this._showTimeoutId),this._hideTimeoutId=setTimeout(()=>{this._toggleVisibility(!1),this._hideTimeoutId=void 0},t)}afterHidden(){return this._onHide}isVisible(){return this._isVisible}ngOnDestroy(){this._cancelPendingAnimations(),this._onHide.complete(),this._triggerElement=null}_handleBodyInteraction(){this._closeOnInteraction&&this.hide(0)}_markForCheck(){this._changeDetectorRef.markForCheck()}_handleMouseLeave({relatedTarget:t}){(!t||!this._triggerElement.contains(t))&&(this.isVisible()?this.hide(this._mouseLeaveHideDelay):this._finalizeAnimation(!1))}_onShow(){this._isMultiline=this._isTooltipMultiline(),this._markForCheck()}_isTooltipMultiline(){let t=this._elementRef.nativeElement.getBoundingClientRect();return t.height>ta&&t.width>=ea}_handleAnimationEnd({animationName:t}){(t===this._showAnimation||t===this._hideAnimation)&&this._finalizeAnimation(t===this._showAnimation)}_cancelPendingAnimations(){this._showTimeoutId!=null&&clearTimeout(this._showTimeoutId),this._hideTimeoutId!=null&&clearTimeout(this._hideTimeoutId),this._showTimeoutId=this._hideTimeoutId=void 0}_finalizeAnimation(t){t?this._closeOnInteraction=!0:this.isVisible()||this._onHide.next()}_toggleVisibility(t){let e=this._tooltip.nativeElement,a=this._showAnimation,n=this._hideAnimation;if(e.classList.remove(t?n:a),e.classList.add(t?a:n),this._isVisible!==t&&(this._isVisible=t,this._changeDetectorRef.markForCheck()),t&&!this._animationsDisabled&&typeof getComputedStyle=="function"){let r=getComputedStyle(e);(r.getPropertyValue("animation-duration")==="0s"||r.getPropertyValue("animation-name")==="none")&&(this._animationsDisabled=!0)}t&&this._onShow(),this._animationsDisabled&&(e.classList.add("_mat-animation-noopable"),this._finalizeAnimation(t))}static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["mat-tooltip-component"]],viewQuery:function(e,a){if(e&1&&B(qe,7),e&2){let n;S(n=E())&&(a._tooltip=n.first)}},hostAttrs:["aria-hidden","true"],hostBindings:function(e,a){e&1&&v("mouseleave",function(r){return a._handleMouseLeave(r)})},decls:4,vars:5,consts:[["tooltip",""],[1,"mdc-tooltip","mat-mdc-tooltip",3,"animationend"],[1,"mat-mdc-tooltip-surface","mdc-tooltip__surface"]],template:function(e,a){e&1&&(f(0,"div",1,0),yt("animationend",function(r){return a._handleAnimationEnd(r)}),f(2,"div",2),h(3),g()()),e&2&&($(a.tooltipClass),x("mdc-tooltip--multiline",a._isMultiline),d(3),Y(a.message))},styles:[`.mat-mdc-tooltip {
  position: relative;
  transform: scale(0);
  display: inline-flex;
}
.mat-mdc-tooltip::before {
  content: "";
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  position: absolute;
}
.mat-mdc-tooltip-panel-below .mat-mdc-tooltip::before {
  top: -8px;
}
.mat-mdc-tooltip-panel-above .mat-mdc-tooltip::before {
  bottom: -8px;
}
.mat-mdc-tooltip-panel-right .mat-mdc-tooltip::before {
  left: -8px;
}
.mat-mdc-tooltip-panel-left .mat-mdc-tooltip::before {
  right: -8px;
}
.mat-mdc-tooltip._mat-animation-noopable {
  animation: none;
  transform: scale(1);
}

.mat-mdc-tooltip-surface {
  word-break: normal;
  overflow-wrap: anywhere;
  padding: 4px 8px;
  min-width: 40px;
  max-width: 200px;
  min-height: 24px;
  max-height: 40vh;
  box-sizing: border-box;
  overflow: hidden;
  text-align: center;
  will-change: transform, opacity;
  background-color: var(--mat-tooltip-container-color, var(--mat-sys-inverse-surface));
  color: var(--mat-tooltip-supporting-text-color, var(--mat-sys-inverse-on-surface));
  border-radius: var(--mat-tooltip-container-shape, var(--mat-sys-corner-extra-small));
  font-family: var(--mat-tooltip-supporting-text-font, var(--mat-sys-body-small-font));
  font-size: var(--mat-tooltip-supporting-text-size, var(--mat-sys-body-small-size));
  font-weight: var(--mat-tooltip-supporting-text-weight, var(--mat-sys-body-small-weight));
  line-height: var(--mat-tooltip-supporting-text-line-height, var(--mat-sys-body-small-line-height));
  letter-spacing: var(--mat-tooltip-supporting-text-tracking, var(--mat-sys-body-small-tracking));
}
.mat-mdc-tooltip-surface::before {
  position: absolute;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border: 1px solid transparent;
  border-radius: inherit;
  content: "";
  pointer-events: none;
}
.mdc-tooltip--multiline .mat-mdc-tooltip-surface {
  text-align: left;
}
[dir=rtl] .mdc-tooltip--multiline .mat-mdc-tooltip-surface {
  text-align: right;
}

.mat-mdc-tooltip-panel {
  line-height: normal;
}
.mat-mdc-tooltip-panel.mat-mdc-tooltip-panel-non-interactive {
  pointer-events: none;
}

@keyframes mat-mdc-tooltip-show {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes mat-mdc-tooltip-hide {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
}
.mat-mdc-tooltip-show {
  animation: mat-mdc-tooltip-show 150ms cubic-bezier(0, 0, 0.2, 1) forwards;
}

.mat-mdc-tooltip-hide {
  animation: mat-mdc-tooltip-hide 75ms cubic-bezier(0.4, 0, 1, 1) forwards;
}
`],encapsulation:2,changeDetection:0})}return i})();var na=["mat-calendar-body",""];function ia(i,o){return this._trackRow(o)}var Te=(i,o)=>o.id;function ra(i,o){if(i&1&&(f(0,"tr",0)(1,"td",3),h(2),g()()),i&2){let t=u();d(),Dt("padding-top",t._cellPadding)("padding-bottom",t._cellPadding),A("colspan",t.numCols),d(),F(" ",t.label," ")}}function oa(i,o){if(i&1&&(f(0,"td",3),h(1),g()),i&2){let t=u(2);Dt("padding-top",t._cellPadding)("padding-bottom",t._cellPadding),A("colspan",t._firstRowOffset),d(),F(" ",t._firstRowOffset>=t.labelMinRequiredCells?t.label:""," ")}}function sa(i,o){if(i&1){let t=dt();f(0,"td",6)(1,"button",7),yt("click",function(a){let n=y(t).$implicit,r=u(2);return D(r._cellClicked(n,a))})("focus",function(a){let n=y(t).$implicit,r=u(2);return D(r._emitActiveDateChange(n,a))}),f(2,"span",8),h(3),g(),T(4,"span",9),g()()}if(i&2){let t=o.$implicit,e=o.$index,a=u().$index,n=u();Dt("width",n._cellWidth)("padding-top",n._cellPadding)("padding-bottom",n._cellPadding),A("data-mat-row",a)("data-mat-col",e),d(),$(t.cssClasses),x("mat-calendar-body-disabled",!t.enabled)("mat-calendar-body-active",n._isActiveCell(a,e))("mat-calendar-body-range-start",n._isRangeStart(t.compareValue))("mat-calendar-body-range-end",n._isRangeEnd(t.compareValue))("mat-calendar-body-in-range",n._isInRange(t.compareValue))("mat-calendar-body-comparison-bridge-start",n._isComparisonBridgeStart(t.compareValue,a,e))("mat-calendar-body-comparison-bridge-end",n._isComparisonBridgeEnd(t.compareValue,a,e))("mat-calendar-body-comparison-start",n._isComparisonStart(t.compareValue))("mat-calendar-body-comparison-end",n._isComparisonEnd(t.compareValue))("mat-calendar-body-in-comparison-range",n._isInComparisonRange(t.compareValue))("mat-calendar-body-preview-start",n._isPreviewStart(t.compareValue))("mat-calendar-body-preview-end",n._isPreviewEnd(t.compareValue))("mat-calendar-body-in-preview",n._isInPreview(t.compareValue)),U("tabIndex",n._isActiveCell(a,e)?0:-1),A("aria-label",t.ariaLabel)("aria-disabled",!t.enabled||null)("aria-pressed",n._isSelected(t.compareValue))("aria-current",n.todayValue===t.compareValue?"date":null)("aria-describedby",n._getDescribedby(t.compareValue)),d(),x("mat-calendar-body-selected",n._isSelected(t.compareValue))("mat-calendar-body-comparison-identical",n._isComparisonIdentical(t.compareValue))("mat-calendar-body-today",n.todayValue===t.compareValue),d(),F(" ",t.displayValue," ")}}function da(i,o){if(i&1&&(f(0,"tr",1),K(1,oa,2,6,"td",4),W(2,sa,5,49,"td",5,Te),g()),i&2){let t=o.$implicit,e=o.$index,a=u();d(),G(e===0&&a._firstRowOffset?1:-1),d(),q(t)}}function la(i,o){if(i&1&&(l(0,"th",2)(1,"span",6),h(2),c(),l(3,"span",3),h(4),c()()),i&2){let t=o.$implicit;d(2),Y(t.long),d(2),Y(t.narrow)}}var ca=["*"];function ma(i,o){}function ua(i,o){if(i&1){let t=dt();l(0,"mat-month-view",4),xt("activeDateChange",function(a){y(t);let n=u();return wt(n.activeDate,a)||(n.activeDate=a),D(a)}),v("_userSelection",function(a){y(t);let n=u();return D(n._dateSelected(a))})("dragStarted",function(a){y(t);let n=u();return D(n._dragStarted(a))})("dragEnded",function(a){y(t);let n=u();return D(n._dragEnded(a))}),c()}if(i&2){let t=u();Ct("activeDate",t.activeDate),w("selected",t.selected)("dateFilter",t.dateFilter)("maxDate",t.maxDate)("minDate",t.minDate)("dateClass",t.dateClass)("comparisonStart",t.comparisonStart)("comparisonEnd",t.comparisonEnd)("startDateAccessibleName",t.startDateAccessibleName)("endDateAccessibleName",t.endDateAccessibleName)("activeDrag",t._activeDrag)}}function pa(i,o){if(i&1){let t=dt();l(0,"mat-year-view",5),xt("activeDateChange",function(a){y(t);let n=u();return wt(n.activeDate,a)||(n.activeDate=a),D(a)}),v("monthSelected",function(a){y(t);let n=u();return D(n._monthSelectedInYearView(a))})("selectedChange",function(a){y(t);let n=u();return D(n._goToDateInView(a,"month"))}),c()}if(i&2){let t=u();Ct("activeDate",t.activeDate),w("selected",t.selected)("dateFilter",t.dateFilter)("maxDate",t.maxDate)("minDate",t.minDate)("dateClass",t.dateClass)}}function ha(i,o){if(i&1){let t=dt();l(0,"mat-multi-year-view",6),xt("activeDateChange",function(a){y(t);let n=u();return wt(n.activeDate,a)||(n.activeDate=a),D(a)}),v("yearSelected",function(a){y(t);let n=u();return D(n._yearSelectedInMultiYearView(a))})("selectedChange",function(a){y(t);let n=u();return D(n._goToDateInView(a,"year"))}),c()}if(i&2){let t=u();Ct("activeDate",t.activeDate),w("selected",t.selected)("dateFilter",t.dateFilter)("maxDate",t.maxDate)("minDate",t.minDate)("dateClass",t.dateClass)}}var re=(()=>{class i{changes=new L;calendarLabel="Calendar";openCalendarLabel="Open calendar";closeCalendarLabel="Close calendar";prevMonthLabel="Previous month";nextMonthLabel="Next month";prevYearLabel="Previous year";nextYearLabel="Next year";prevMultiYearLabel="Previous 24 years";nextMultiYearLabel="Next 24 years";switchToMonthViewLabel="Choose date";switchToMultiYearViewLabel="Choose month and year";startDateLabel="Start date";endDateLabel="End date";comparisonDateLabel="Comparison range";formatYearRange(t,e){return`${t} \u2013 ${e}`}formatYearRangeLabel(t,e){return`${t} to ${e}`}static \u0275fac=function(e){return new(e||i)};static \u0275prov=z({token:i,factory:i.\u0275fac,providedIn:"root"})}return i})(),ba=0,pt=class{value;displayValue;ariaLabel;enabled;compareValue;rawValue;id=ba++;cssClasses;constructor(o,t,e,a,n,r=o,b){this.value=o,this.displayValue=t,this.ariaLabel=e,this.enabled=a,this.compareValue=r,this.rawValue=b,this.cssClasses=n instanceof Set?Array.from(n):n}},_a={passive:!1,capture:!0},It={passive:!0,capture:!0},Me={passive:!0},at=(()=>{class i{_elementRef=s(M);_ngZone=s(H);_platform=s(kt);_intl=s(re);_eventCleanups;_skipNextFocus=!1;_focusActiveCellAfterViewChecked=!1;label;rows;todayValue;startValue;endValue;labelMinRequiredCells;numCols=7;activeCell=0;ngAfterViewChecked(){this._focusActiveCellAfterViewChecked&&(this._focusActiveCell(),this._focusActiveCellAfterViewChecked=!1)}isRange=!1;cellAspectRatio=1;comparisonStart=null;comparisonEnd=null;previewStart=null;previewEnd=null;startDateAccessibleName=null;endDateAccessibleName=null;selectedValueChange=new m;previewChange=new m;activeDateChange=new m;dragStarted=new m;dragEnded=new m;_firstRowOffset;_cellPadding;_cellWidth;_startDateLabelId;_endDateLabelId;_comparisonStartDateLabelId;_comparisonEndDateLabelId;_didDragSinceMouseDown=!1;_injector=s(it);comparisonDateAccessibleName=this._intl.comparisonDateLabel;_trackRow=t=>t;constructor(){let t=s(j),e=s(Nt);this._startDateLabelId=e.getId("mat-calendar-body-start-"),this._endDateLabelId=e.getId("mat-calendar-body-end-"),this._comparisonStartDateLabelId=e.getId("mat-calendar-body-comparison-start-"),this._comparisonEndDateLabelId=e.getId("mat-calendar-body-comparison-end-"),s(Z).load(St),this._ngZone.runOutsideAngular(()=>{let a=this._elementRef.nativeElement,n=[t.listen(a,"touchmove",this._touchmoveHandler,_a),t.listen(a,"mouseenter",this._enterHandler,It),t.listen(a,"focus",this._enterHandler,It),t.listen(a,"mouseleave",this._leaveHandler,It),t.listen(a,"blur",this._leaveHandler,It),t.listen(a,"mousedown",this._mousedownHandler,Me),t.listen(a,"touchstart",this._mousedownHandler,Me)];this._platform.isBrowser&&n.push(t.listen("window","mouseup",this._mouseupHandler),t.listen("window","touchend",this._touchendHandler)),this._eventCleanups=n})}_cellClicked(t,e){this._didDragSinceMouseDown||t.enabled&&this.selectedValueChange.emit({value:t.value,event:e})}_emitActiveDateChange(t,e){t.enabled&&this.activeDateChange.emit({value:t.value,event:e})}_isSelected(t){return this.startValue===t||this.endValue===t}ngOnChanges(t){let e=t.numCols,{rows:a,numCols:n}=this;(t.rows||e)&&(this._firstRowOffset=a&&a.length&&a[0].length?n-a[0].length:0),(t.cellAspectRatio||e||!this._cellPadding)&&(this._cellPadding=`${50*this.cellAspectRatio/n}%`),(e||!this._cellWidth)&&(this._cellWidth=`${100/n}%`)}ngOnDestroy(){this._eventCleanups.forEach(t=>t())}_isActiveCell(t,e){let a=t*this.numCols+e;return t&&(a-=this._firstRowOffset),a==this.activeCell}_focusActiveCell(t=!0){rt(()=>{setTimeout(()=>{let e=this._elementRef.nativeElement.querySelector(".mat-calendar-body-active");e&&(t||(this._skipNextFocus=!0),e.focus())})},{injector:this._injector})}_scheduleFocusActiveCellAfterViewChecked(){this._focusActiveCellAfterViewChecked=!0}_isRangeStart(t){return Gt(t,this.startValue,this.endValue)}_isRangeEnd(t){return Wt(t,this.startValue,this.endValue)}_isInRange(t){return qt(t,this.startValue,this.endValue,this.isRange)}_isComparisonStart(t){return Gt(t,this.comparisonStart,this.comparisonEnd)}_isComparisonBridgeStart(t,e,a){if(!this._isComparisonStart(t)||this._isRangeStart(t)||!this._isInRange(t))return!1;let n=this.rows[e][a-1];if(!n){let r=this.rows[e-1];n=r&&r[r.length-1]}return n&&!this._isRangeEnd(n.compareValue)}_isComparisonBridgeEnd(t,e,a){if(!this._isComparisonEnd(t)||this._isRangeEnd(t)||!this._isInRange(t))return!1;let n=this.rows[e][a+1];if(!n){let r=this.rows[e+1];n=r&&r[0]}return n&&!this._isRangeStart(n.compareValue)}_isComparisonEnd(t){return Wt(t,this.comparisonStart,this.comparisonEnd)}_isInComparisonRange(t){return qt(t,this.comparisonStart,this.comparisonEnd,this.isRange)}_isComparisonIdentical(t){return this.comparisonStart===this.comparisonEnd&&t===this.comparisonStart}_isPreviewStart(t){return Gt(t,this.previewStart,this.previewEnd)}_isPreviewEnd(t){return Wt(t,this.previewStart,this.previewEnd)}_isInPreview(t){return qt(t,this.previewStart,this.previewEnd,this.isRange)}_getDescribedby(t){if(!this.isRange)return null;if(this.startValue===t&&this.endValue===t)return`${this._startDateLabelId} ${this._endDateLabelId}`;if(this.startValue===t)return this._startDateLabelId;if(this.endValue===t)return this._endDateLabelId;if(this.comparisonStart!==null&&this.comparisonEnd!==null){if(t===this.comparisonStart&&t===this.comparisonEnd)return`${this._comparisonStartDateLabelId} ${this._comparisonEndDateLabelId}`;if(t===this.comparisonStart)return this._comparisonStartDateLabelId;if(t===this.comparisonEnd)return this._comparisonEndDateLabelId}return null}_enterHandler=t=>{if(this._skipNextFocus&&t.type==="focus"){this._skipNextFocus=!1;return}if(t.target&&this.isRange){let e=this._getCellFromElement(t.target);e&&this._ngZone.run(()=>this.previewChange.emit({value:e.enabled?e:null,event:t}))}};_touchmoveHandler=t=>{if(!this.isRange)return;let e=Se(t),a=e?this._getCellFromElement(e):null;e!==t.target&&(this._didDragSinceMouseDown=!0),Kt(t.target)&&t.preventDefault(),this._ngZone.run(()=>this.previewChange.emit({value:a?.enabled?a:null,event:t}))};_leaveHandler=t=>{this.previewEnd!==null&&this.isRange&&(t.type!=="blur"&&(this._didDragSinceMouseDown=!0),t.target&&this._getCellFromElement(t.target)&&!(t.relatedTarget&&this._getCellFromElement(t.relatedTarget))&&this._ngZone.run(()=>this.previewChange.emit({value:null,event:t})))};_mousedownHandler=t=>{if(!this.isRange)return;this._didDragSinceMouseDown=!1;let e=t.target&&this._getCellFromElement(t.target);!e||!this._isInRange(e.compareValue)||this._ngZone.run(()=>{this.dragStarted.emit({value:e.rawValue,event:t})})};_mouseupHandler=t=>{if(!this.isRange)return;let e=Kt(t.target);if(!e){this._ngZone.run(()=>{this.dragEnded.emit({value:null,event:t})});return}e.closest(".mat-calendar-body")===this._elementRef.nativeElement&&this._ngZone.run(()=>{let a=this._getCellFromElement(e);this.dragEnded.emit({value:a?.rawValue??null,event:t})})};_touchendHandler=t=>{let e=Se(t);e&&this._mouseupHandler({target:e})};_getCellFromElement(t){let e=Kt(t);if(e){let a=e.getAttribute("data-mat-row"),n=e.getAttribute("data-mat-col");if(a&&n)return this.rows[parseInt(a)]?.[parseInt(n)]||null}return null}static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["","mat-calendar-body",""]],hostAttrs:[1,"mat-calendar-body"],inputs:{label:"label",rows:"rows",todayValue:"todayValue",startValue:"startValue",endValue:"endValue",labelMinRequiredCells:"labelMinRequiredCells",numCols:"numCols",activeCell:"activeCell",isRange:"isRange",cellAspectRatio:"cellAspectRatio",comparisonStart:"comparisonStart",comparisonEnd:"comparisonEnd",previewStart:"previewStart",previewEnd:"previewEnd",startDateAccessibleName:"startDateAccessibleName",endDateAccessibleName:"endDateAccessibleName"},outputs:{selectedValueChange:"selectedValueChange",previewChange:"previewChange",activeDateChange:"activeDateChange",dragStarted:"dragStarted",dragEnded:"dragEnded"},exportAs:["matCalendarBody"],features:[vt],attrs:na,decls:11,vars:11,consts:[["aria-hidden","true"],["role","row"],[1,"mat-calendar-body-hidden-label",3,"id"],[1,"mat-calendar-body-label"],[1,"mat-calendar-body-label",3,"paddingTop","paddingBottom"],["role","gridcell",1,"mat-calendar-body-cell-container",3,"width","paddingTop","paddingBottom"],["role","gridcell",1,"mat-calendar-body-cell-container"],["type","button",1,"mat-calendar-body-cell",3,"click","focus","tabindex"],[1,"mat-calendar-body-cell-content","mat-focus-indicator"],["aria-hidden","true",1,"mat-calendar-body-cell-preview"]],template:function(e,a){e&1&&(K(0,ra,3,6,"tr",0),W(1,da,4,1,"tr",1,ia,!0),f(3,"span",2),h(4),g(),f(5,"span",2),h(6),g(),f(7,"span",2),h(8),g(),f(9,"span",2),h(10),g()),e&2&&(G(a._firstRowOffset<a.labelMinRequiredCells?0:-1),d(),q(a.rows),d(2),U("id",a._startDateLabelId),d(),F(" ",a.startDateAccessibleName,`
`),d(),U("id",a._endDateLabelId),d(),F(" ",a.endDateAccessibleName,`
`),d(),U("id",a._comparisonStartDateLabelId),d(),Pt(" ",a.comparisonDateAccessibleName," ",a.startDateAccessibleName,`
`),d(),U("id",a._comparisonEndDateLabelId),d(),Pt(" ",a.comparisonDateAccessibleName," ",a.endDateAccessibleName,`
`))},styles:[`.mat-calendar-body {
  min-width: 224px;
}

.mat-calendar-body-today:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
  border-color: var(--mat-datepicker-calendar-date-today-outline-color, var(--mat-sys-primary));
}

.mat-calendar-body-label {
  height: 0;
  line-height: 0;
  text-align: start;
  padding-left: 4.7142857143%;
  padding-right: 4.7142857143%;
  font-size: var(--mat-datepicker-calendar-body-label-text-size, var(--mat-sys-title-small-size));
  font-weight: var(--mat-datepicker-calendar-body-label-text-weight, var(--mat-sys-title-small-weight));
  color: var(--mat-datepicker-calendar-body-label-text-color, var(--mat-sys-on-surface));
}

.mat-calendar-body-hidden-label {
  display: none;
}

.mat-calendar-body-cell-container {
  position: relative;
  height: 0;
  line-height: 0;
}

.mat-calendar-body-cell {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: none;
  text-align: center;
  outline: none;
  margin: 0;
  font-family: var(--mat-datepicker-calendar-text-font, var(--mat-sys-body-medium-font));
  font-size: var(--mat-datepicker-calendar-text-size, var(--mat-sys-body-medium-size));
  -webkit-user-select: none;
  user-select: none;
  cursor: pointer;
  outline: none;
  border: none;
  -webkit-tap-highlight-color: transparent;
}
.mat-calendar-body-cell::-moz-focus-inner {
  border: 0;
}

.mat-calendar-body-cell::before,
.mat-calendar-body-cell::after,
.mat-calendar-body-cell-preview {
  content: "";
  position: absolute;
  top: 5%;
  left: 0;
  z-index: 0;
  box-sizing: border-box;
  display: block;
  height: 90%;
  width: 100%;
}

.mat-calendar-body-range-start:not(.mat-calendar-body-in-comparison-range)::before,
.mat-calendar-body-range-start::after,
.mat-calendar-body-comparison-start:not(.mat-calendar-body-comparison-bridge-start)::before,
.mat-calendar-body-comparison-start::after,
.mat-calendar-body-preview-start .mat-calendar-body-cell-preview {
  left: 5%;
  width: 95%;
  border-top-left-radius: 999px;
  border-bottom-left-radius: 999px;
}
[dir=rtl] .mat-calendar-body-range-start:not(.mat-calendar-body-in-comparison-range)::before,
[dir=rtl] .mat-calendar-body-range-start::after,
[dir=rtl] .mat-calendar-body-comparison-start:not(.mat-calendar-body-comparison-bridge-start)::before,
[dir=rtl] .mat-calendar-body-comparison-start::after,
[dir=rtl] .mat-calendar-body-preview-start .mat-calendar-body-cell-preview {
  left: 0;
  border-radius: 0;
  border-top-right-radius: 999px;
  border-bottom-right-radius: 999px;
}

.mat-calendar-body-range-end:not(.mat-calendar-body-in-comparison-range)::before,
.mat-calendar-body-range-end::after,
.mat-calendar-body-comparison-end:not(.mat-calendar-body-comparison-bridge-end)::before,
.mat-calendar-body-comparison-end::after,
.mat-calendar-body-preview-end .mat-calendar-body-cell-preview {
  width: 95%;
  border-top-right-radius: 999px;
  border-bottom-right-radius: 999px;
}
[dir=rtl] .mat-calendar-body-range-end:not(.mat-calendar-body-in-comparison-range)::before,
[dir=rtl] .mat-calendar-body-range-end::after,
[dir=rtl] .mat-calendar-body-comparison-end:not(.mat-calendar-body-comparison-bridge-end)::before,
[dir=rtl] .mat-calendar-body-comparison-end::after,
[dir=rtl] .mat-calendar-body-preview-end .mat-calendar-body-cell-preview {
  left: 5%;
  border-radius: 0;
  border-top-left-radius: 999px;
  border-bottom-left-radius: 999px;
}

[dir=rtl] .mat-calendar-body-comparison-bridge-start.mat-calendar-body-range-end::after,
[dir=rtl] .mat-calendar-body-comparison-bridge-end.mat-calendar-body-range-start::after {
  width: 95%;
  border-top-right-radius: 999px;
  border-bottom-right-radius: 999px;
}

.mat-calendar-body-comparison-start.mat-calendar-body-range-end::after, [dir=rtl] .mat-calendar-body-comparison-start.mat-calendar-body-range-end::after,
.mat-calendar-body-comparison-end.mat-calendar-body-range-start::after,
[dir=rtl] .mat-calendar-body-comparison-end.mat-calendar-body-range-start::after {
  width: 90%;
}

.mat-calendar-body-in-preview {
  color: var(--mat-datepicker-calendar-date-preview-state-outline-color, var(--mat-sys-primary));
}
.mat-calendar-body-in-preview .mat-calendar-body-cell-preview {
  border-top: dashed 1px;
  border-bottom: dashed 1px;
}

.mat-calendar-body-preview-start .mat-calendar-body-cell-preview {
  border-left: dashed 1px;
}
[dir=rtl] .mat-calendar-body-preview-start .mat-calendar-body-cell-preview {
  border-left: 0;
  border-right: dashed 1px;
}

.mat-calendar-body-preview-end .mat-calendar-body-cell-preview {
  border-right: dashed 1px;
}
[dir=rtl] .mat-calendar-body-preview-end .mat-calendar-body-cell-preview {
  border-right: 0;
  border-left: dashed 1px;
}

.mat-calendar-body-disabled {
  cursor: default;
}
.mat-calendar-body-disabled > .mat-calendar-body-cell-content:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
  color: var(--mat-datepicker-calendar-date-disabled-state-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-calendar-body-disabled > .mat-calendar-body-today:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
  border-color: var(--mat-datepicker-calendar-date-today-disabled-state-outline-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
@media (forced-colors: active) {
  .mat-calendar-body-disabled {
    opacity: 0.5;
  }
}

.mat-calendar-body-cell-content {
  top: 5%;
  left: 5%;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 90%;
  height: 90%;
  line-height: 1;
  border-width: 1px;
  border-style: solid;
  border-radius: 999px;
  color: var(--mat-datepicker-calendar-date-text-color, var(--mat-sys-on-surface));
  border-color: var(--mat-datepicker-calendar-date-outline-color, transparent);
}
.mat-calendar-body-cell-content.mat-focus-indicator {
  position: absolute;
}
@media (forced-colors: active) {
  .mat-calendar-body-cell-content {
    border: none;
  }
}

.cdk-keyboard-focused .mat-calendar-body-active > .mat-calendar-body-cell-content:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical), .cdk-program-focused .mat-calendar-body-active > .mat-calendar-body-cell-content:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
  background-color: var(--mat-datepicker-calendar-date-focus-state-background-color, color-mix(in srgb, var(--mat-sys-on-surface) calc(var(--mat-sys-focus-state-layer-opacity) * 100%), transparent));
}

@media (hover: hover) {
  .mat-calendar-body-cell:not(.mat-calendar-body-disabled):hover > .mat-calendar-body-cell-content:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
    background-color: var(--mat-datepicker-calendar-date-hover-state-background-color, color-mix(in srgb, var(--mat-sys-on-surface) calc(var(--mat-sys-hover-state-layer-opacity) * 100%), transparent));
  }
}
.mat-calendar-body-selected {
  background-color: var(--mat-datepicker-calendar-date-selected-state-background-color, var(--mat-sys-primary));
  color: var(--mat-datepicker-calendar-date-selected-state-text-color, var(--mat-sys-on-primary));
}
.mat-calendar-body-disabled > .mat-calendar-body-selected {
  background-color: var(--mat-datepicker-calendar-date-selected-disabled-state-background-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-calendar-body-selected.mat-calendar-body-today {
  box-shadow: inset 0 0 0 1px var(--mat-datepicker-calendar-date-today-selected-state-outline-color, var(--mat-sys-primary));
}

.mat-calendar-body-in-range::before {
  background: var(--mat-datepicker-calendar-date-in-range-state-background-color, var(--mat-sys-primary-container));
}

.mat-calendar-body-comparison-identical,
.mat-calendar-body-in-comparison-range::before {
  background: var(--mat-datepicker-calendar-date-in-comparison-range-state-background-color, var(--mat-sys-tertiary-container));
}

.mat-calendar-body-comparison-identical,
.mat-calendar-body-in-comparison-range::before {
  background: var(--mat-datepicker-calendar-date-in-comparison-range-state-background-color, var(--mat-sys-tertiary-container));
}

.mat-calendar-body-comparison-bridge-start::before,
[dir=rtl] .mat-calendar-body-comparison-bridge-end::before {
  background: linear-gradient(to right, var(--mat-datepicker-calendar-date-in-range-state-background-color, var(--mat-sys-primary-container)) 50%, var(--mat-datepicker-calendar-date-in-comparison-range-state-background-color, var(--mat-sys-tertiary-container)) 50%);
}

.mat-calendar-body-comparison-bridge-end::before,
[dir=rtl] .mat-calendar-body-comparison-bridge-start::before {
  background: linear-gradient(to left, var(--mat-datepicker-calendar-date-in-range-state-background-color, var(--mat-sys-primary-container)) 50%, var(--mat-datepicker-calendar-date-in-comparison-range-state-background-color, var(--mat-sys-tertiary-container)) 50%);
}

.mat-calendar-body-in-range > .mat-calendar-body-comparison-identical,
.mat-calendar-body-in-comparison-range.mat-calendar-body-in-range::after {
  background: var(--mat-datepicker-calendar-date-in-overlap-range-state-background-color, var(--mat-sys-secondary-container));
}

.mat-calendar-body-comparison-identical.mat-calendar-body-selected,
.mat-calendar-body-in-comparison-range > .mat-calendar-body-selected {
  background: var(--mat-datepicker-calendar-date-in-overlap-range-selected-state-background-color, var(--mat-sys-secondary));
}

@media (forced-colors: active) {
  .mat-datepicker-popup:not(:empty),
  .mat-calendar-body-cell:not(.mat-calendar-body-in-range) .mat-calendar-body-selected {
    outline: solid 1px;
  }
  .mat-calendar-body-today {
    outline: dotted 1px;
  }
  .mat-calendar-body-cell::before,
  .mat-calendar-body-cell::after,
  .mat-calendar-body-selected {
    background: none;
  }
  .mat-calendar-body-in-range::before,
  .mat-calendar-body-comparison-bridge-start::before,
  .mat-calendar-body-comparison-bridge-end::before {
    border-top: solid 1px;
    border-bottom: solid 1px;
  }
  .mat-calendar-body-range-start::before {
    border-left: solid 1px;
  }
  [dir=rtl] .mat-calendar-body-range-start::before {
    border-left: 0;
    border-right: solid 1px;
  }
  .mat-calendar-body-range-end::before {
    border-right: solid 1px;
  }
  [dir=rtl] .mat-calendar-body-range-end::before {
    border-right: 0;
    border-left: solid 1px;
  }
  .mat-calendar-body-in-comparison-range::before {
    border-top: dashed 1px;
    border-bottom: dashed 1px;
  }
  .mat-calendar-body-comparison-start::before {
    border-left: dashed 1px;
  }
  [dir=rtl] .mat-calendar-body-comparison-start::before {
    border-left: 0;
    border-right: dashed 1px;
  }
  .mat-calendar-body-comparison-end::before {
    border-right: dashed 1px;
  }
  [dir=rtl] .mat-calendar-body-comparison-end::before {
    border-right: 0;
    border-left: dashed 1px;
  }
}
`],encapsulation:2,changeDetection:0})}return i})();function jt(i){return i?.nodeName==="TD"}function Kt(i){let o;return jt(i)?o=i:jt(i.parentNode)?o=i.parentNode:jt(i.parentNode?.parentNode)&&(o=i.parentNode.parentNode),o?.getAttribute("data-mat-row")!=null?o:null}function Gt(i,o,t){return t!==null&&o!==t&&i<t&&i===o}function Wt(i,o,t){return o!==null&&o!==t&&i>=o&&i===t}function qt(i,o,t,e){return e&&o!==null&&t!==null&&o!==t&&i>=o&&i<=t}function Se(i){let o=i.changedTouches[0];return document.elementFromPoint(o.clientX,o.clientY)}var k=class{start;end;_disableStructuralEquivalency;constructor(o,t){this.start=o,this.end=t}},$t=(()=>{class i{selection;_adapter;_selectionChanged=new L;selectionChanged=this._selectionChanged;constructor(t,e){this.selection=t,this._adapter=e,this.selection=t}updateSelection(t,e){let a=this.selection;this.selection=t,this._selectionChanged.next({selection:t,source:e,oldValue:a})}ngOnDestroy(){this._selectionChanged.complete()}_isValidDateInstance(t){return this._adapter.isDateInstance(t)&&this._adapter.isValid(t)}static \u0275fac=function(e){se()};static \u0275prov=z({token:i,factory:i.\u0275fac})}return i})(),fa=(()=>{class i extends $t{constructor(t){super(null,t)}add(t){super.updateSelection(t,this)}isValid(){return this.selection!=null&&this._isValidDateInstance(this.selection)}isComplete(){return this.selection!=null}clone(){let t=new i(this._adapter);return t.updateSelection(this.selection,this),t}static \u0275fac=function(e){return new(e||i)(ft(O))};static \u0275prov=z({token:i,factory:i.\u0275fac})}return i})();var ga={provide:$t,useFactory:()=>s($t,{optional:!0,skipSelf:!0})||new fa(s(O))};var va=new N("MAT_DATE_RANGE_SELECTION_STRATEGY");var Ut=7,ya=0,Ee=(()=>{class i{_changeDetectorRef=s(P);_dateFormats=s(lt,{optional:!0});_dateAdapter=s(O,{optional:!0});_dir=s(J,{optional:!0});_rangeStrategy=s(va,{optional:!0});_rerenderSubscription=bt.EMPTY;_selectionKeyPressed=!1;get activeDate(){return this._activeDate}set activeDate(t){let e=this._activeDate,a=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))||this._dateAdapter.today();this._activeDate=this._dateAdapter.clampDate(a,this.minDate,this.maxDate),this._hasSameMonthAndYear(e,this._activeDate)||this._init()}_activeDate;get selected(){return this._selected}set selected(t){t instanceof k?this._selected=t:this._selected=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t)),this._setRanges(this._selected)}_selected=null;get minDate(){return this._minDate}set minDate(t){this._minDate=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_minDate=null;get maxDate(){return this._maxDate}set maxDate(t){this._maxDate=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_maxDate=null;dateFilter;dateClass;comparisonStart=null;comparisonEnd=null;startDateAccessibleName=null;endDateAccessibleName=null;activeDrag=null;selectedChange=new m;_userSelection=new m;dragStarted=new m;dragEnded=new m;activeDateChange=new m;_matCalendarBody;_monthLabel=p("");_weeks=p([]);_firstWeekOffset=p(0);_rangeStart=p(null);_rangeEnd=p(null);_comparisonRangeStart=p(null);_comparisonRangeEnd=p(null);_previewStart=p(null);_previewEnd=p(null);_isRange=p(!1);_todayDate=p(null);_weekdays=p([]);constructor(){s(Z).load(Lt),this._activeDate=this._dateAdapter.today()}ngAfterContentInit(){this._rerenderSubscription=this._dateAdapter.localeChanges.pipe(_t(null)).subscribe(()=>this._init())}ngOnChanges(t){let e=t.comparisonStart||t.comparisonEnd;e&&!e.firstChange&&this._setRanges(this.selected),t.activeDrag&&!this.activeDrag&&this._clearPreview()}ngOnDestroy(){this._rerenderSubscription.unsubscribe()}_dateSelected(t){let e=t.value,a=this._getDateFromDayOfMonth(e),n,r;this._selected instanceof k?(n=this._getDateInCurrentMonth(this._selected.start),r=this._getDateInCurrentMonth(this._selected.end)):n=r=this._getDateInCurrentMonth(this._selected),(n!==e||r!==e)&&this.selectedChange.emit(a),this._userSelection.emit({value:a,event:t.event}),this._clearPreview(),this._changeDetectorRef.markForCheck()}_updateActiveDate(t){let e=t.value,a=this._activeDate;this.activeDate=this._getDateFromDayOfMonth(e),this._dateAdapter.compareDate(a,this.activeDate)&&this.activeDateChange.emit(this._activeDate)}_handleCalendarBodyKeydown(t){let e=this._activeDate,a=this._isRtl();switch(t.keyCode){case 37:this.activeDate=this._dateAdapter.addCalendarDays(this._activeDate,a?1:-1);break;case 39:this.activeDate=this._dateAdapter.addCalendarDays(this._activeDate,a?-1:1);break;case 38:this.activeDate=this._dateAdapter.addCalendarDays(this._activeDate,-7);break;case 40:this.activeDate=this._dateAdapter.addCalendarDays(this._activeDate,7);break;case 36:this.activeDate=this._dateAdapter.addCalendarDays(this._activeDate,1-this._dateAdapter.getDate(this._activeDate));break;case 35:this.activeDate=this._dateAdapter.addCalendarDays(this._activeDate,this._dateAdapter.getNumDaysInMonth(this._activeDate)-this._dateAdapter.getDate(this._activeDate));break;case 33:this.activeDate=t.altKey?this._dateAdapter.addCalendarYears(this._activeDate,-1):this._dateAdapter.addCalendarMonths(this._activeDate,-1);break;case 34:this.activeDate=t.altKey?this._dateAdapter.addCalendarYears(this._activeDate,1):this._dateAdapter.addCalendarMonths(this._activeDate,1);break;case 13:case 32:this._selectionKeyPressed=!0,this._canSelect(this._activeDate)&&t.preventDefault();return;case 27:this._previewEnd()!=null&&!Mt(t)&&(this._clearPreview(),this.activeDrag?this.dragEnded.emit({value:null,event:t}):(this.selectedChange.emit(null),this._userSelection.emit({value:null,event:t})),t.preventDefault(),t.stopPropagation());return;default:return}this._dateAdapter.compareDate(e,this.activeDate)&&(this.activeDateChange.emit(this.activeDate),this._focusActiveCellAfterViewChecked()),t.preventDefault()}_handleCalendarBodyKeyup(t){(t.keyCode===32||t.keyCode===13)&&(this._selectionKeyPressed&&this._canSelect(this._activeDate)&&this._dateSelected({value:this._dateAdapter.getDate(this._activeDate),event:t}),this._selectionKeyPressed=!1)}_init(){this._setRanges(this.selected),this._todayDate.set(this._getCellCompareValue(this._dateAdapter.today())),this._monthLabel.set(this._dateFormats.display.monthLabel?this._dateAdapter.format(this.activeDate,this._dateFormats.display.monthLabel):this._dateAdapter.getMonthNames("short")[this._dateAdapter.getMonth(this.activeDate)].toLocaleUpperCase());let t=this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate),this._dateAdapter.getMonth(this.activeDate),1);this._firstWeekOffset.set((Ut+this._dateAdapter.getDayOfWeek(t)-this._dateAdapter.getFirstDayOfWeek())%Ut),this._initWeekdays(),this._createWeekCells(),this._changeDetectorRef.markForCheck()}_focusActiveCell(t){this._matCalendarBody._focusActiveCell(t)}_focusActiveCellAfterViewChecked(){this._matCalendarBody._scheduleFocusActiveCellAfterViewChecked()}_previewChanged({event:t,value:e}){if(this._rangeStrategy){let a=e?e.rawValue:null,n=this._rangeStrategy.createPreview(a,this.selected,t);if(this._previewStart.set(this._getCellCompareValue(n.start)),this._previewEnd.set(this._getCellCompareValue(n.end)),this.activeDrag&&a){let r=this._rangeStrategy.createDrag?.(this.activeDrag.value,this.selected,a,t);r&&(this._previewStart.set(this._getCellCompareValue(r.start)),this._previewEnd.set(this._getCellCompareValue(r.end)))}}}_dragEnded(t){if(this.activeDrag)if(t.value){let e=this._rangeStrategy?.createDrag?.(this.activeDrag.value,this.selected,t.value,t.event);this.dragEnded.emit({value:e??null,event:t.event})}else this.dragEnded.emit({value:null,event:t.event})}_getDateFromDayOfMonth(t){return this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate),this._dateAdapter.getMonth(this.activeDate),t)}_initWeekdays(){let t=this._dateAdapter.getFirstDayOfWeek(),e=this._dateAdapter.getDayOfWeekNames("narrow"),n=this._dateAdapter.getDayOfWeekNames("long").map((r,b)=>({long:r,narrow:e[b],id:ya++}));this._weekdays.set(n.slice(t).concat(n.slice(0,t)))}_createWeekCells(){let t=this._dateAdapter.getNumDaysInMonth(this.activeDate),e=this._dateAdapter.getDateNames(),a=[[]];for(let n=0,r=this._firstWeekOffset();n<t;n++,r++){r==Ut&&(a.push([]),r=0);let b=this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate),this._dateAdapter.getMonth(this.activeDate),n+1),ht=this._shouldEnableDate(b),Oe=this._dateAdapter.format(b,this._dateFormats.display.dateA11yLabel),Le=this.dateClass?this.dateClass(b,"month"):void 0;a[a.length-1].push(new pt(n+1,e[n],Oe,ht,Le,this._getCellCompareValue(b),b))}this._weeks.set(a)}_shouldEnableDate(t){return!!t&&(!this.minDate||this._dateAdapter.compareDate(t,this.minDate)>=0)&&(!this.maxDate||this._dateAdapter.compareDate(t,this.maxDate)<=0)&&(!this.dateFilter||this.dateFilter(t))}_getDateInCurrentMonth(t){return t&&this._hasSameMonthAndYear(t,this.activeDate)?this._dateAdapter.getDate(t):null}_hasSameMonthAndYear(t,e){return!!(t&&e&&this._dateAdapter.getMonth(t)==this._dateAdapter.getMonth(e)&&this._dateAdapter.getYear(t)==this._dateAdapter.getYear(e))}_getCellCompareValue(t){if(t){let e=this._dateAdapter.getYear(t),a=this._dateAdapter.getMonth(t),n=this._dateAdapter.getDate(t);return new Date(e,a,n).getTime()}return null}_isRtl(){return this._dir&&this._dir.value==="rtl"}_setRanges(t){t instanceof k?(this._rangeStart.set(this._getCellCompareValue(t.start)),this._rangeEnd.set(this._getCellCompareValue(t.end)),this._isRange.set(!0)):(this._rangeStart.set(this._getCellCompareValue(t)),this._rangeEnd.set(this._rangeStart()),this._isRange.set(!1)),this._comparisonRangeStart.set(this._getCellCompareValue(this.comparisonStart)),this._comparisonRangeEnd.set(this._getCellCompareValue(this.comparisonEnd))}_canSelect(t){return!this.dateFilter||this.dateFilter(t)}_clearPreview(){this._previewStart.set(null),this._previewEnd.set(null)}static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["mat-month-view"]],viewQuery:function(e,a){if(e&1&&B(at,5),e&2){let n;S(n=E())&&(a._matCalendarBody=n.first)}},inputs:{activeDate:"activeDate",selected:"selected",minDate:"minDate",maxDate:"maxDate",dateFilter:"dateFilter",dateClass:"dateClass",comparisonStart:"comparisonStart",comparisonEnd:"comparisonEnd",startDateAccessibleName:"startDateAccessibleName",endDateAccessibleName:"endDateAccessibleName",activeDrag:"activeDrag"},outputs:{selectedChange:"selectedChange",_userSelection:"_userSelection",dragStarted:"dragStarted",dragEnded:"dragEnded",activeDateChange:"activeDateChange"},exportAs:["matMonthView"],features:[vt],decls:8,vars:14,consts:[["role","grid",1,"mat-calendar-table"],[1,"mat-calendar-table-header"],["scope","col"],["aria-hidden","true"],["colspan","7",1,"mat-calendar-table-header-divider"],["mat-calendar-body","",3,"selectedValueChange","activeDateChange","previewChange","dragStarted","dragEnded","keyup","keydown","label","rows","todayValue","startValue","endValue","comparisonStart","comparisonEnd","previewStart","previewEnd","isRange","labelMinRequiredCells","activeCell","startDateAccessibleName","endDateAccessibleName"],[1,"cdk-visually-hidden"]],template:function(e,a){e&1&&(l(0,"table",0)(1,"thead",1)(2,"tr"),W(3,la,5,2,"th",2,Te),c(),l(5,"tr",3),V(6,"th",4),c()(),l(7,"tbody",5),v("selectedValueChange",function(r){return a._dateSelected(r)})("activeDateChange",function(r){return a._updateActiveDate(r)})("previewChange",function(r){return a._previewChanged(r)})("dragStarted",function(r){return a.dragStarted.emit(r)})("dragEnded",function(r){return a._dragEnded(r)})("keyup",function(r){return a._handleCalendarBodyKeyup(r)})("keydown",function(r){return a._handleCalendarBodyKeydown(r)}),c()()),e&2&&(d(3),q(a._weekdays()),d(4),w("label",a._monthLabel())("rows",a._weeks())("todayValue",a._todayDate())("startValue",a._rangeStart())("endValue",a._rangeEnd())("comparisonStart",a._comparisonRangeStart())("comparisonEnd",a._comparisonRangeEnd())("previewStart",a._previewStart())("previewEnd",a._previewEnd())("isRange",a._isRange())("labelMinRequiredCells",3)("activeCell",a._dateAdapter.getDate(a.activeDate)-1)("startDateAccessibleName",a.startDateAccessibleName)("endDateAccessibleName",a.endDateAccessibleName))},dependencies:[at],encapsulation:2,changeDetection:0})}return i})(),C=24,Qt=4,Ie=(()=>{class i{_changeDetectorRef=s(P);_dateAdapter=s(O,{optional:!0});_dir=s(J,{optional:!0});_rerenderSubscription=bt.EMPTY;_selectionKeyPressed=!1;get activeDate(){return this._activeDate}set activeDate(t){let e=this._activeDate,a=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))||this._dateAdapter.today();this._activeDate=this._dateAdapter.clampDate(a,this.minDate,this.maxDate),Re(this._dateAdapter,e,this._activeDate,this.minDate,this.maxDate)||this._init()}_activeDate;get selected(){return this._selected}set selected(t){t instanceof k?this._selected=t:this._selected=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t)),this._setSelectedYear(t)}_selected=null;get minDate(){return this._minDate}set minDate(t){this._minDate=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_minDate=null;get maxDate(){return this._maxDate}set maxDate(t){this._maxDate=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_maxDate=null;dateFilter;dateClass;selectedChange=new m;yearSelected=new m;activeDateChange=new m;_matCalendarBody;_years=p([]);_todayYear=p(0);_selectedYear=p(null);constructor(){this._dateAdapter,this._activeDate=this._dateAdapter.today()}ngAfterContentInit(){this._rerenderSubscription=this._dateAdapter.localeChanges.pipe(_t(null)).subscribe(()=>this._init())}ngOnDestroy(){this._rerenderSubscription.unsubscribe()}_init(){this._todayYear.set(this._dateAdapter.getYear(this._dateAdapter.today()));let e=this._dateAdapter.getYear(this._activeDate)-ut(this._dateAdapter,this.activeDate,this.minDate,this.maxDate),a=[];for(let n=0,r=[];n<C;n++)r.push(e+n),r.length==Qt&&(a.push(r.map(b=>this._createCellForYear(b))),r=[]);this._years.set(a),this._changeDetectorRef.markForCheck()}_yearSelected(t){let e=t.value,a=this._dateAdapter.createDate(e,0,1),n=this._getDateFromYear(e);this.yearSelected.emit(a),this.selectedChange.emit(n)}_updateActiveDate(t){let e=t.value,a=this._activeDate;this.activeDate=this._getDateFromYear(e),this._dateAdapter.compareDate(a,this.activeDate)&&this.activeDateChange.emit(this.activeDate)}_handleCalendarBodyKeydown(t){let e=this._activeDate,a=this._isRtl();switch(t.keyCode){case 37:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,a?1:-1);break;case 39:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,a?-1:1);break;case 38:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,-Qt);break;case 40:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,Qt);break;case 36:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,-ut(this._dateAdapter,this.activeDate,this.minDate,this.maxDate));break;case 35:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,C-ut(this._dateAdapter,this.activeDate,this.minDate,this.maxDate)-1);break;case 33:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,t.altKey?-C*10:-C);break;case 34:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,t.altKey?C*10:C);break;case 13:case 32:this._selectionKeyPressed=!0;break;default:return}this._dateAdapter.compareDate(e,this.activeDate)&&this.activeDateChange.emit(this.activeDate),this._focusActiveCellAfterViewChecked(),t.preventDefault()}_handleCalendarBodyKeyup(t){(t.keyCode===32||t.keyCode===13)&&(this._selectionKeyPressed&&this._yearSelected({value:this._dateAdapter.getYear(this._activeDate),event:t}),this._selectionKeyPressed=!1)}_getActiveCell(){return ut(this._dateAdapter,this.activeDate,this.minDate,this.maxDate)}_focusActiveCell(){this._matCalendarBody._focusActiveCell()}_focusActiveCellAfterViewChecked(){this._matCalendarBody._scheduleFocusActiveCellAfterViewChecked()}_getDateFromYear(t){let e=this._dateAdapter.getMonth(this.activeDate),a=this._dateAdapter.getNumDaysInMonth(this._dateAdapter.createDate(t,e,1));return this._dateAdapter.createDate(t,e,Math.min(this._dateAdapter.getDate(this.activeDate),a))}_createCellForYear(t){let e=this._dateAdapter.createDate(t,0,1),a=this._dateAdapter.getYearName(e),n=this.dateClass?this.dateClass(e,"multi-year"):void 0;return new pt(t,a,a,this._shouldEnableYear(t),n)}_shouldEnableYear(t){if(t==null||this.maxDate&&t>this._dateAdapter.getYear(this.maxDate)||this.minDate&&t<this._dateAdapter.getYear(this.minDate))return!1;if(!this.dateFilter)return!0;let e=this._dateAdapter.createDate(t,0,1);for(let a=e;this._dateAdapter.getYear(a)==t;a=this._dateAdapter.addCalendarDays(a,1))if(this.dateFilter(a))return!0;return!1}_isRtl(){return this._dir&&this._dir.value==="rtl"}_setSelectedYear(t){if(this._selectedYear.set(null),t instanceof k){let e=t.start||t.end;e&&this._selectedYear.set(this._dateAdapter.getYear(e))}else t&&this._selectedYear.set(this._dateAdapter.getYear(t))}static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["mat-multi-year-view"]],viewQuery:function(e,a){if(e&1&&B(at,5),e&2){let n;S(n=E())&&(a._matCalendarBody=n.first)}},inputs:{activeDate:"activeDate",selected:"selected",minDate:"minDate",maxDate:"maxDate",dateFilter:"dateFilter",dateClass:"dateClass"},outputs:{selectedChange:"selectedChange",yearSelected:"yearSelected",activeDateChange:"activeDateChange"},exportAs:["matMultiYearView"],decls:5,vars:7,consts:[["role","grid",1,"mat-calendar-table"],["aria-hidden","true",1,"mat-calendar-table-header"],["colspan","4",1,"mat-calendar-table-header-divider"],["mat-calendar-body","",3,"selectedValueChange","activeDateChange","keyup","keydown","rows","todayValue","startValue","endValue","numCols","cellAspectRatio","activeCell"]],template:function(e,a){e&1&&(l(0,"table",0)(1,"thead",1)(2,"tr"),V(3,"th",2),c()(),l(4,"tbody",3),v("selectedValueChange",function(r){return a._yearSelected(r)})("activeDateChange",function(r){return a._updateActiveDate(r)})("keyup",function(r){return a._handleCalendarBodyKeyup(r)})("keydown",function(r){return a._handleCalendarBodyKeydown(r)}),c()()),e&2&&(d(4),w("rows",a._years())("todayValue",a._todayYear())("startValue",a._selectedYear())("endValue",a._selectedYear())("numCols",4)("cellAspectRatio",4/7)("activeCell",a._getActiveCell()))},dependencies:[at],encapsulation:2,changeDetection:0})}return i})();function Re(i,o,t,e,a){let n=i.getYear(o),r=i.getYear(t),b=Fe(i,e,a);return Math.floor((n-b)/C)===Math.floor((r-b)/C)}function ut(i,o,t,e){let a=i.getYear(o);return Da(a-Fe(i,t,e),C)}function Fe(i,o,t){let e=0;return t?e=i.getYear(t)-C+1:o&&(e=i.getYear(o)),e}function Da(i,o){return(i%o+o)%o}var Ve=(()=>{class i{_changeDetectorRef=s(P);_dateFormats=s(lt,{optional:!0});_dateAdapter=s(O,{optional:!0});_dir=s(J,{optional:!0});_rerenderSubscription=bt.EMPTY;_selectionKeyPressed=!1;get activeDate(){return this._activeDate}set activeDate(t){let e=this._activeDate,a=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))||this._dateAdapter.today();this._activeDate=this._dateAdapter.clampDate(a,this.minDate,this.maxDate),this._dateAdapter.getYear(e)!==this._dateAdapter.getYear(this._activeDate)&&this._init()}_activeDate;get selected(){return this._selected}set selected(t){t instanceof k?this._selected=t:this._selected=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t)),this._setSelectedMonth(t)}_selected=null;get minDate(){return this._minDate}set minDate(t){this._minDate=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_minDate=null;get maxDate(){return this._maxDate}set maxDate(t){this._maxDate=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_maxDate=null;dateFilter;dateClass;selectedChange=new m;monthSelected=new m;activeDateChange=new m;_matCalendarBody;_months=p([]);_yearLabel=p("");_todayMonth=p(null);_selectedMonth=p(null);constructor(){this._activeDate=this._dateAdapter.today()}ngAfterContentInit(){this._rerenderSubscription=this._dateAdapter.localeChanges.pipe(_t(null)).subscribe(()=>this._init())}ngOnDestroy(){this._rerenderSubscription.unsubscribe()}_monthSelected(t){let e=t.value,a=this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate),e,1);this.monthSelected.emit(a);let n=this._getDateFromMonth(e);this.selectedChange.emit(n)}_updateActiveDate(t){let e=t.value,a=this._activeDate;this.activeDate=this._getDateFromMonth(e),this._dateAdapter.compareDate(a,this.activeDate)&&this.activeDateChange.emit(this.activeDate)}_handleCalendarBodyKeydown(t){let e=this._activeDate,a=this._isRtl();switch(t.keyCode){case 37:this.activeDate=this._dateAdapter.addCalendarMonths(this._activeDate,a?1:-1);break;case 39:this.activeDate=this._dateAdapter.addCalendarMonths(this._activeDate,a?-1:1);break;case 38:this.activeDate=this._dateAdapter.addCalendarMonths(this._activeDate,-4);break;case 40:this.activeDate=this._dateAdapter.addCalendarMonths(this._activeDate,4);break;case 36:this.activeDate=this._dateAdapter.addCalendarMonths(this._activeDate,-this._dateAdapter.getMonth(this._activeDate));break;case 35:this.activeDate=this._dateAdapter.addCalendarMonths(this._activeDate,11-this._dateAdapter.getMonth(this._activeDate));break;case 33:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,t.altKey?-10:-1);break;case 34:this.activeDate=this._dateAdapter.addCalendarYears(this._activeDate,t.altKey?10:1);break;case 13:case 32:this._selectionKeyPressed=!0;break;default:return}this._dateAdapter.compareDate(e,this.activeDate)&&(this.activeDateChange.emit(this.activeDate),this._focusActiveCellAfterViewChecked()),t.preventDefault()}_handleCalendarBodyKeyup(t){(t.keyCode===32||t.keyCode===13)&&(this._selectionKeyPressed&&this._monthSelected({value:this._dateAdapter.getMonth(this._activeDate),event:t}),this._selectionKeyPressed=!1)}_init(){this._setSelectedMonth(this.selected),this._todayMonth.set(this._getMonthInCurrentYear(this._dateAdapter.today())),this._yearLabel.set(this._dateAdapter.getYearName(this.activeDate));let t=this._dateAdapter.getMonthNames("short");this._months.set([[0,1,2,3],[4,5,6,7],[8,9,10,11]].map(e=>e.map(a=>this._createCellForMonth(a,t[a])))),this._changeDetectorRef.markForCheck()}_focusActiveCell(){this._matCalendarBody._focusActiveCell()}_focusActiveCellAfterViewChecked(){this._matCalendarBody._scheduleFocusActiveCellAfterViewChecked()}_getMonthInCurrentYear(t){return t&&this._dateAdapter.getYear(t)==this._dateAdapter.getYear(this.activeDate)?this._dateAdapter.getMonth(t):null}_getDateFromMonth(t){let e=this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate),t,1),a=this._dateAdapter.getNumDaysInMonth(e);return this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate),t,Math.min(this._dateAdapter.getDate(this.activeDate),a))}_createCellForMonth(t,e){let a=this._dateAdapter.createDate(this._dateAdapter.getYear(this.activeDate),t,1),n=this._dateAdapter.format(a,this._dateFormats.display.monthYearA11yLabel),r=this.dateClass?this.dateClass(a,"year"):void 0;return new pt(t,e.toLocaleUpperCase(),n,this._shouldEnableMonth(t),r)}_shouldEnableMonth(t){let e=this._dateAdapter.getYear(this.activeDate);if(t==null||this._isYearAndMonthAfterMaxDate(e,t)||this._isYearAndMonthBeforeMinDate(e,t))return!1;if(!this.dateFilter)return!0;let a=this._dateAdapter.createDate(e,t,1);for(let n=a;this._dateAdapter.getMonth(n)==t;n=this._dateAdapter.addCalendarDays(n,1))if(this.dateFilter(n))return!0;return!1}_isYearAndMonthAfterMaxDate(t,e){if(this.maxDate){let a=this._dateAdapter.getYear(this.maxDate),n=this._dateAdapter.getMonth(this.maxDate);return t>a||t===a&&e>n}return!1}_isYearAndMonthBeforeMinDate(t,e){if(this.minDate){let a=this._dateAdapter.getYear(this.minDate),n=this._dateAdapter.getMonth(this.minDate);return t<a||t===a&&e<n}return!1}_isRtl(){return this._dir&&this._dir.value==="rtl"}_setSelectedMonth(t){t instanceof k?this._selectedMonth.set(this._getMonthInCurrentYear(t.start)||this._getMonthInCurrentYear(t.end)):this._selectedMonth.set(this._getMonthInCurrentYear(t))}static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["mat-year-view"]],viewQuery:function(e,a){if(e&1&&B(at,5),e&2){let n;S(n=E())&&(a._matCalendarBody=n.first)}},inputs:{activeDate:"activeDate",selected:"selected",minDate:"minDate",maxDate:"maxDate",dateFilter:"dateFilter",dateClass:"dateClass"},outputs:{selectedChange:"selectedChange",monthSelected:"monthSelected",activeDateChange:"activeDateChange"},exportAs:["matYearView"],decls:5,vars:9,consts:[["role","grid",1,"mat-calendar-table"],["aria-hidden","true",1,"mat-calendar-table-header"],["colspan","4",1,"mat-calendar-table-header-divider"],["mat-calendar-body","",3,"selectedValueChange","activeDateChange","keyup","keydown","label","rows","todayValue","startValue","endValue","labelMinRequiredCells","numCols","cellAspectRatio","activeCell"]],template:function(e,a){e&1&&(l(0,"table",0)(1,"thead",1)(2,"tr"),V(3,"th",2),c()(),l(4,"tbody",3),v("selectedValueChange",function(r){return a._monthSelected(r)})("activeDateChange",function(r){return a._updateActiveDate(r)})("keyup",function(r){return a._handleCalendarBodyKeyup(r)})("keydown",function(r){return a._handleCalendarBodyKeydown(r)}),c()()),e&2&&(d(4),w("label",a._yearLabel())("rows",a._months())("todayValue",a._todayMonth())("startValue",a._selectedMonth())("endValue",a._selectedMonth())("labelMinRequiredCells",2)("numCols",4)("cellAspectRatio",4/7)("activeCell",a._dateAdapter.getMonth(a.activeDate)))},dependencies:[at],encapsulation:2,changeDetection:0})}return i})(),Ca=(()=>{class i{_intl=s(re);calendar=s(oe);_dateAdapter=s(O,{optional:!0});_dateFormats=s(lt,{optional:!0});_periodButtonText;_periodButtonDescription;_periodButtonLabel;_prevButtonLabel;_nextButtonLabel;constructor(){s(Z).load(Lt);let t=s(P);this._updateLabels(),this.calendar.stateChanges.subscribe(()=>{this._updateLabels(),t.markForCheck()})}get periodButtonText(){return this._periodButtonText}get periodButtonDescription(){return this._periodButtonDescription}get periodButtonLabel(){return this._periodButtonLabel}get prevButtonLabel(){return this._prevButtonLabel}get nextButtonLabel(){return this._nextButtonLabel}currentPeriodClicked(){this.calendar.currentView=this.calendar.currentView=="month"?"multi-year":"month"}previousClicked(){this.previousEnabled()&&(this.calendar.activeDate=this.calendar.currentView=="month"?this._dateAdapter.addCalendarMonths(this.calendar.activeDate,-1):this._dateAdapter.addCalendarYears(this.calendar.activeDate,this.calendar.currentView=="year"?-1:-C))}nextClicked(){this.nextEnabled()&&(this.calendar.activeDate=this.calendar.currentView=="month"?this._dateAdapter.addCalendarMonths(this.calendar.activeDate,1):this._dateAdapter.addCalendarYears(this.calendar.activeDate,this.calendar.currentView=="year"?1:C))}previousEnabled(){return this.calendar.minDate?!this.calendar.minDate||!this._isSameView(this.calendar.activeDate,this.calendar.minDate):!0}nextEnabled(){return!this.calendar.maxDate||!this._isSameView(this.calendar.activeDate,this.calendar.maxDate)}_updateLabels(){let t=this.calendar,e=this._intl,a=this._dateAdapter;t.currentView==="month"?(this._periodButtonText=a.format(t.activeDate,this._dateFormats.display.monthYearLabel).toLocaleUpperCase(),this._periodButtonDescription=a.format(t.activeDate,this._dateFormats.display.monthYearLabel).toLocaleUpperCase(),this._periodButtonLabel=e.switchToMultiYearViewLabel,this._prevButtonLabel=e.prevMonthLabel,this._nextButtonLabel=e.nextMonthLabel):t.currentView==="year"?(this._periodButtonText=a.getYearName(t.activeDate),this._periodButtonDescription=a.getYearName(t.activeDate),this._periodButtonLabel=e.switchToMonthViewLabel,this._prevButtonLabel=e.prevYearLabel,this._nextButtonLabel=e.nextYearLabel):(this._periodButtonText=e.formatYearRange(...this._formatMinAndMaxYearLabels()),this._periodButtonDescription=e.formatYearRangeLabel(...this._formatMinAndMaxYearLabels()),this._periodButtonLabel=e.switchToMonthViewLabel,this._prevButtonLabel=e.prevMultiYearLabel,this._nextButtonLabel=e.nextMultiYearLabel)}_isSameView(t,e){return this.calendar.currentView=="month"?this._dateAdapter.getYear(t)==this._dateAdapter.getYear(e)&&this._dateAdapter.getMonth(t)==this._dateAdapter.getMonth(e):this.calendar.currentView=="year"?this._dateAdapter.getYear(t)==this._dateAdapter.getYear(e):Re(this._dateAdapter,t,e,this.calendar.minDate,this.calendar.maxDate)}_formatMinAndMaxYearLabels(){let e=this._dateAdapter.getYear(this.calendar.activeDate)-ut(this._dateAdapter,this.calendar.activeDate,this.calendar.minDate,this.calendar.maxDate),a=e+C-1,n=this._dateAdapter.getYearName(this._dateAdapter.createDate(e,0,1)),r=this._dateAdapter.getYearName(this._dateAdapter.createDate(a,0,1));return[n,r]}_periodButtonLabelId=s(Nt).getId("mat-calendar-period-label-");static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["mat-calendar-header"]],exportAs:["matCalendarHeader"],ngContentSelectors:ca,decls:17,vars:13,consts:[[1,"mat-calendar-header"],[1,"mat-calendar-controls"],["aria-live","polite",1,"cdk-visually-hidden",3,"id"],["matButton","","type","button",1,"mat-calendar-period-button",3,"click"],["aria-hidden","true"],["viewBox","0 0 10 5","focusable","false","aria-hidden","true",1,"mat-calendar-arrow"],["points","0,0 5,5 10,0"],[1,"mat-calendar-spacer"],["matIconButton","","type","button","disabledInteractive","",1,"mat-calendar-previous-button",3,"click","disabled","matTooltip"],["viewBox","0 0 24 24","focusable","false","aria-hidden","true"],["d","M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"],["matIconButton","","type","button","disabledInteractive","",1,"mat-calendar-next-button",3,"click","disabled","matTooltip"],["d","M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"]],template:function(e,a){e&1&&(Q(),l(0,"div",0)(1,"div",1)(2,"span",2),h(3),c(),l(4,"button",3),v("click",function(){return a.currentPeriodClicked()}),l(5,"span",4),h(6),c(),gt(),l(7,"svg",5),V(8,"polygon",6),c()(),Tt(),V(9,"div",7),R(10),l(11,"button",8),v("click",function(){return a.previousClicked()}),gt(),l(12,"svg",9),V(13,"path",10),c()(),Tt(),l(14,"button",11),v("click",function(){return a.nextClicked()}),gt(),l(15,"svg",9),V(16,"path",12),c()()()()),e&2&&(d(2),w("id",a._periodButtonLabelId),d(),Y(a.periodButtonDescription),d(),A("aria-label",a.periodButtonLabel)("aria-describedby",a._periodButtonLabelId),d(2),Y(a.periodButtonText),d(),x("mat-calendar-invert",a.calendar.currentView!=="month"),d(4),w("disabled",!a.previousEnabled())("matTooltip",a.prevButtonLabel),A("aria-label",a.prevButtonLabel),d(3),w("disabled",!a.nextEnabled())("matTooltip",a.nextButtonLabel),A("aria-label",a.nextButtonLabel))},dependencies:[xe,zt,Ae],encapsulation:2,changeDetection:0})}return i})(),oe=(()=>{class i{_dateAdapter=s(O,{optional:!0});_dateFormats=s(lt,{optional:!0});_changeDetectorRef=s(P);_elementRef=s(M);headerComponent;_calendarHeaderPortal;_intlChanges;_moveFocusOnNextTick=!1;get startAt(){return this._startAt}set startAt(t){this._startAt=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_startAt=null;startView="month";get selected(){return this._selected}set selected(t){t instanceof k?this._selected=t:this._selected=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_selected=null;get minDate(){return this._minDate}set minDate(t){this._minDate=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_minDate=null;get maxDate(){return this._maxDate}set maxDate(t){this._maxDate=this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(t))}_maxDate=null;dateFilter;dateClass;comparisonStart=null;comparisonEnd=null;startDateAccessibleName=null;endDateAccessibleName=null;selectedChange=new m;yearSelected=new m;monthSelected=new m;viewChanged=new m(!0);_userSelection=new m;_userDragDrop=new m;monthView;yearView;multiYearView;get activeDate(){return this._clampedActiveDate}set activeDate(t){this._clampedActiveDate=this._dateAdapter.clampDate(t,this.minDate,this.maxDate),this.stateChanges.next(),this._changeDetectorRef.markForCheck()}_clampedActiveDate;get currentView(){return this._currentView}set currentView(t){let e=this._currentView!==t?t:null;this._currentView=t,this._moveFocusOnNextTick=!0,this._changeDetectorRef.markForCheck(),e&&(this.stateChanges.next(),this.viewChanged.emit(e))}_currentView;_activeDrag=null;stateChanges=new L;constructor(){this._intlChanges=s(re).changes.subscribe(()=>{this._changeDetectorRef.markForCheck(),this.stateChanges.next()})}ngAfterContentInit(){this._calendarHeaderPortal=new Et(this.headerComponent||Ca),this.activeDate=this.startAt||this._dateAdapter.today(),this._currentView=this.startView}ngAfterViewChecked(){this._moveFocusOnNextTick&&(this._moveFocusOnNextTick=!1,this.focusActiveCell())}ngOnDestroy(){this._intlChanges.unsubscribe(),this.stateChanges.complete()}ngOnChanges(t){let e=t.minDate&&!this._dateAdapter.sameDate(t.minDate.previousValue,t.minDate.currentValue)?t.minDate:void 0,a=t.maxDate&&!this._dateAdapter.sameDate(t.maxDate.previousValue,t.maxDate.currentValue)?t.maxDate:void 0,n=e||a||t.dateFilter;if(n&&!n.firstChange){let r=this._getCurrentViewComponent();r&&(this._elementRef.nativeElement.contains(ue())&&(this._moveFocusOnNextTick=!0),this._changeDetectorRef.detectChanges(),r._init())}this.stateChanges.next()}focusActiveCell(){this._getCurrentViewComponent()?._focusActiveCell(!1)}updateTodaysDate(){this._getCurrentViewComponent()?._init()}_dateSelected(t){let e=t.value;(this.selected instanceof k||e&&!this._dateAdapter.sameDate(e,this.selected))&&this.selectedChange.emit(e),this._userSelection.emit(t)}_yearSelectedInMultiYearView(t){this.yearSelected.emit(t)}_monthSelectedInYearView(t){this.monthSelected.emit(t)}_goToDateInView(t,e){this.activeDate=t,this.currentView=e}_dragStarted(t){this._activeDrag=t}_dragEnded(t){this._activeDrag&&(t.value&&this._userDragDrop.emit(t),this._activeDrag=null)}_getCurrentViewComponent(){return this.monthView||this.yearView||this.multiYearView}static \u0275fac=function(e){return new(e||i)};static \u0275cmp=_({type:i,selectors:[["mat-calendar"]],viewQuery:function(e,a){if(e&1&&B(Ee,5)(Ve,5)(Ie,5),e&2){let n;S(n=E())&&(a.monthView=n.first),S(n=E())&&(a.yearView=n.first),S(n=E())&&(a.multiYearView=n.first)}},hostAttrs:[1,"mat-calendar"],inputs:{headerComponent:"headerComponent",startAt:"startAt",startView:"startView",selected:"selected",minDate:"minDate",maxDate:"maxDate",dateFilter:"dateFilter",dateClass:"dateClass",comparisonStart:"comparisonStart",comparisonEnd:"comparisonEnd",startDateAccessibleName:"startDateAccessibleName",endDateAccessibleName:"endDateAccessibleName"},outputs:{selectedChange:"selectedChange",yearSelected:"yearSelected",monthSelected:"monthSelected",viewChanged:"viewChanged",_userSelection:"_userSelection",_userDragDrop:"_userDragDrop"},exportAs:["matCalendar"],features:[le([ga]),vt],decls:5,vars:2,consts:[[3,"cdkPortalOutlet"],["cdkMonitorSubtreeFocus","","tabindex","-1",1,"mat-calendar-content"],[3,"activeDate","selected","dateFilter","maxDate","minDate","dateClass","comparisonStart","comparisonEnd","startDateAccessibleName","endDateAccessibleName","activeDrag"],[3,"activeDate","selected","dateFilter","maxDate","minDate","dateClass"],[3,"activeDateChange","_userSelection","dragStarted","dragEnded","activeDate","selected","dateFilter","maxDate","minDate","dateClass","comparisonStart","comparisonEnd","startDateAccessibleName","endDateAccessibleName","activeDrag"],[3,"activeDateChange","monthSelected","selectedChange","activeDate","selected","dateFilter","maxDate","minDate","dateClass"],[3,"activeDateChange","yearSelected","selectedChange","activeDate","selected","dateFilter","maxDate","minDate","dateClass"]],template:function(e,a){if(e&1&&(de(0,ma,0,0,"ng-template",0),l(1,"div",1),K(2,ua,1,11,"mat-month-view",2)(3,pa,1,6,"mat-year-view",3)(4,ha,1,6,"mat-multi-year-view",3),c()),e&2){let n;w("cdkPortalOutlet",a._calendarHeaderPortal),d(2),G((n=a.currentView)==="month"?2:n==="year"?3:n==="multi-year"?4:-1)}},dependencies:[fe,pe,Ee,Ve,Ie],styles:[`.mat-calendar {
  display: block;
  line-height: normal;
  font-family: var(--mat-datepicker-calendar-text-font, var(--mat-sys-body-medium-font));
  font-size: var(--mat-datepicker-calendar-text-size, var(--mat-sys-body-medium-size));
}

.mat-calendar-header {
  padding: 8px 8px 0 8px;
}

.mat-calendar-content {
  padding: 0 8px 8px 8px;
  outline: none;
}

.mat-calendar-controls {
  display: flex;
  align-items: center;
  margin: 5% calc(4.7142857143% - 16px);
}

.mat-calendar-spacer {
  flex: 1 1 auto;
}

.mat-calendar-period-button {
  min-width: 0;
  margin: 0 8px;
  font-size: var(--mat-datepicker-calendar-period-button-text-size, var(--mat-sys-title-small-size));
  font-weight: var(--mat-datepicker-calendar-period-button-text-weight, var(--mat-sys-title-small-weight));
  --mat-button-text-label-text-color: var(--mat-datepicker-calendar-period-button-text-color, var(--mat-sys-on-surface-variant));
}

.mat-calendar-arrow {
  display: inline-block;
  width: 10px;
  height: 5px;
  margin: 0 0 0 5px;
  vertical-align: middle;
  fill: var(--mat-datepicker-calendar-period-button-icon-color, var(--mat-sys-on-surface-variant));
}
.mat-calendar-arrow.mat-calendar-invert {
  transform: rotate(180deg);
}
[dir=rtl] .mat-calendar-arrow {
  margin: 0 5px 0 0;
}
@media (forced-colors: active) {
  .mat-calendar-arrow {
    fill: CanvasText;
  }
}

.mat-datepicker-content .mat-calendar-previous-button:not(.mat-mdc-button-disabled),
.mat-datepicker-content .mat-calendar-next-button:not(.mat-mdc-button-disabled) {
  color: var(--mat-datepicker-calendar-navigation-button-icon-color, var(--mat-sys-on-surface-variant));
}
[dir=rtl] .mat-calendar-previous-button,
[dir=rtl] .mat-calendar-next-button {
  transform: rotate(180deg);
}

.mat-calendar-table {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
}

.mat-calendar-table-header th {
  text-align: center;
  padding: 0 0 8px 0;
  color: var(--mat-datepicker-calendar-header-text-color, var(--mat-sys-on-surface-variant));
  font-size: var(--mat-datepicker-calendar-header-text-size, var(--mat-sys-title-small-size));
  font-weight: var(--mat-datepicker-calendar-header-text-weight, var(--mat-sys-title-small-weight));
}

.mat-calendar-table-header-divider {
  position: relative;
  height: 1px;
}
.mat-calendar-table-header-divider::after {
  content: "";
  position: absolute;
  top: 0;
  left: -8px;
  right: -8px;
  height: 1px;
  background: var(--mat-datepicker-calendar-header-divider-color, transparent);
}

.mat-calendar-body-cell-content::before {
  margin: calc(calc(var(--mat-focus-indicator-border-width, 3px) + 3px) * -1);
}

.mat-calendar-body-cell:focus-visible .mat-focus-indicator::before {
  content: "";
}
`],encapsulation:2,changeDetection:0})}return i})();var Vt=class i{constructor(o){this.taskService=o}taskService;tasksForMonth(o,t){return this.taskService.tasksSignal().filter(e=>{if(!e.dueDate)return!1;let a=new Date(e.dueDate);return a.getMonth()===o&&a.getFullYear()===t})}overdue(o){return o.dueDate?new Date(o.dueDate)<new Date&&o.status!=="DONE":!1}getTasksForDate(o){return this.taskService.tasksSignal().filter(t=>t.dueDate===o)}static \u0275fac=function(t){return new(t||i)(ft(De))};static \u0275prov=z({token:i,factory:i.\u0275fac,providedIn:"root"})};var wa=(i,o)=>o.id;function xa(i,o){i&1&&h(0," \u26A0\uFE0F ")}function ka(i,o){if(i&1&&(l(0,"div"),h(1),K(2,xa,1,0),c()),i&2){let t=o.$implicit;d(),F(" ",t.title," "),d(),G(t.status!=="DONE"?2:-1)}}var Pe=class i{service=s(Vt);selected=new Date;tasks=[];change(o){this.selected=o;let t=o.toISOString().substring(0,10);this.tasks=this.service.getTasksForDate(t)}static \u0275fac=function(t){return new(t||i)};static \u0275cmp=_({type:i,selectors:[["app-calendar"]],decls:7,vars:0,consts:[[3,"selectedChange"]],template:function(t,e){t&1&&(l(0,"h1"),h(1,"Calendrier projet"),c(),l(2,"mat-calendar",0),v("selectedChange",function(n){return e.change(n)}),c(),l(3,"h2"),h(4,"T\xE2ches pr\xE9vues"),c(),W(5,ka,3,2,"div",null,wa)),t&2&&(d(5),q(e.tasks))},dependencies:[oe],encapsulation:2})};export{Pe as CalendarComponent};
