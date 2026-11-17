// Production help installer with isolated DOM controls; native checks are separate.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict')
const ts = require('../node_modules/typescript')
const document = {activeElement: null}
class Element {
  constructor() {this.isConnected = true; this.attrs = {}}
  focus() {document.activeElement = this}
  getClientRects() {return [{}]}
  setAttribute(k,v) {this.attrs[k] = v}
  closest(selector) {return selector === '[aria-label="Open help"]' && this === opener ? opener : selector === '#helpGuidanceModal button' && this === button ? button : null}
}
const opener = new Element(), button = new Element(), title = new Element(), dialog = new Element(), backdrop = new Element()
backdrop.style = {display: 'none'}
dialog.querySelector = () => title; dialog.querySelectorAll = () => [button]; backdrop.querySelector = () => dialog
const handlers = {}, root = {querySelector: () => backdrop, addEventListener: (n,f) => handlers[n] = f}
const window = {closeHelpModal() {backdrop.style.display = 'none'}}
const exportsModel = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../services/api/dashboard-help.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
  {exports: exportsModel, document, window, Element})
const listeners = []; exportsModel.installDashboardHelp(root,listeners)
assert.equal(dialog.attrs.role, 'dialog'); assert.equal(dialog.attrs['aria-modal'],'true'); assert.equal(dialog.attrs['aria-labelledby'],title.id)
const open = () => {backdrop.style.display = 'flex'; opener.focus(); handlers.click({target:opener}); assert.equal(document.activeElement,button)}
open()
for (const shiftKey of [false,true]) {let prevented = false; handlers.keydown({key:'Tab',shiftKey,preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(document.activeElement,button)}
handlers.keydown({key:'Escape',preventDefault(){}}); assert.equal(backdrop.style.display,'none');assert.equal(document.activeElement,opener)
open();window.closeHelpModal();handlers.click({target:button});assert.equal(document.activeElement,opener)
open();window.closeHelpModal();handlers.click({target:backdrop});assert.equal(document.activeElement,opener)
assert.equal(listeners.length,2)
console.log(JSON.stringify({status:'PASS_ISOLATED_HELP_KEYBOARD',checks:['dialog name','initial focus','Tab and Shift+Tab containment','Escape dismissal/focus return','button and backdrop focus return','listener ownership']}))
