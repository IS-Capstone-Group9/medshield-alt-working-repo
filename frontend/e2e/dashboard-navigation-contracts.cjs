// Actual navigation patch/functions, isolated DOM. Native pointer checks separate.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const ts=require('../node_modules/typescript'),root=path.resolve(__dirname,'../..')
const reference=ts.createSourceFile('reference.ts',fs.readFileSync(path.join(root,'frontend/lib/medshieldReference.ts'),'utf8'),ts.ScriptTarget.Latest,true)
const declarations=reference.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations])
const original=declarations.find(n=>n.name.getText(reference)==='MEDSHIELD_SCRIPT').initializer.text
const css=declarations.find(n=>n.name.getText(reference)==='LEGACY_MEDSHIELD_STYLE').initializer.text
assert.match(css,/@media \(max-width: 1024px\)[\s\S]*?\.sidebar\s*\{\s*transform: translateX\(-100%\)/)
const patch={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/dashboard-navigation-runtime.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:patch})
const ast=ts.createSourceFile('patched.js',patch.patchDashboardNavigation(original),ts.ScriptTarget.Latest,true)
const names=['getResponsiveNavState','updateNavigationToggle','setNavigationState','toggleNavigation','closeNavigation']
const functions=names.map(name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(ast)).join('\n')
const constants=ast.statements.filter(ts.isVariableStatement).filter(n=>n.declarationList.declarations.some(d=>['NAV_HIDE_WIDTH','NAV_COLLAPSE_WIDTH'].includes(d.name.getText(ast)))).map(n=>n.getText(ast)).join('\n')
const classes=new Set(),attrs={},button={setAttribute:(k,v)=>attrs[k]=v,focus(){document.activeElement=button}}
const sidebar={inert:false,contains:e=>e===navItem},navItem={}
const document={activeElement:button,documentElement:{clientWidth:824},body:{dataset:{},classList:{contains:k=>classes.has(k),remove:k=>classes.delete(k),toggle(k,force){const add=force===undefined?!classes.has(k):force;add?classes.add(k):classes.delete(k);return add}}},querySelector:s=>s==='.sidebar'?sidebar:s==='.nav-toggle'?button:null,getElementById:()=>({style:{}})}
const context=vm.createContext({window:{innerWidth:824},document,resizeChartsAfterShellChange(){}})
vm.runInContext(constants+'\nlet manualNavState=null;\n'+functions,context)
let cases=0
for(const width of [390,760,769,824,1024,1025,1180,1181,1440]){
 context.window.innerWidth=width;const expected=width<=1024?'hidden':width<=1180?'collapsed':'expanded'
 assert.equal(vm.runInContext('getResponsiveNavState()',context),expected)
 context.expected=expected;vm.runInContext('setNavigationState(expected)',context)
 if(expected==='hidden'){
  assert.equal(sidebar.inert,true);assert.equal(attrs['aria-expanded'],'false')
  vm.runInContext('toggleNavigation()',context);assert.equal(classes.has('nav-open'),true);assert.equal(sidebar.inert,false);assert.equal(attrs['aria-expanded'],'true')
  document.activeElement=navItem;vm.runInContext('closeNavigation()',context);assert.equal(sidebar.inert,true);assert.equal(document.activeElement,button);assert.equal(attrs['aria-expanded'],'false')
 }else {
  assert.equal(sidebar.inert,false)
  document.activeElement=navItem;vm.runInContext('closeNavigation()',context)
  assert.equal(document.activeElement,navItem,'desktop close must preserve the available help opener')
 }
 cases++
}
console.log(JSON.stringify({status:'PASS_COMPILED_NAVIGATION_BREAKPOINTS',cases,css_drawer_boundary:1024,checks:['script/CSS boundary parity','drawer toggle','closed drawer inert','expanded state','focus return on close']}))
