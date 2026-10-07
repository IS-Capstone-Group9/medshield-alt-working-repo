const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('../../backend/node_modules/dotenv');
for (const file of [process.env.MEDSHIELD_ENV_FILE, 'backend/.env', '.env'].filter(Boolean)) {
  if (fs.existsSync(file)) dotenv.config({path:file,quiet:true});
}
async function main() {
  const evidence = { checked_at:new Date().toISOString(), scope:'Authenticated validation and warehouse metadata only; no analytical query, migration or compute-state change', cases:[] };
  const base = 'http://localhost:5000';
  const login = await fetch(base + '/api/auth/login', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:process.env.MEDSHIELD_E2E_USERNAME || 'admin',password:process.env.MEDSHIELD_E2E_PASSWORD || 'Medshield!2025'})});
  evidence.login_status = login.status;
  const auth = await login.json();
  if (login.ok && auth.access_token) {
    for (const query of [
      'diagnostics?start_date=2025-02-30&end_date=2025-12-31',
      'diagnostics?start_date=2025-01-01',
      'diagnostics?start_date=2025-01-01&end_date=2025-12-31&sector=invalid',
      'diagnostics?start_date=2025-01-01&end_date=2025-12-31&product_id=invalid',
      'diagnostics?start_date=2025-01-01&start_date=2024-01-01&end_date=2025-12-31',
      'diagnostics?start_date=2025-01-01&end_date=2025-12-31&category=invalid',
      'transactions?start_date=2025-01-01',
      'summary?start_date=2025-01-01&end_date=2025-12-31&sector=invalid',
    ]) {
      const response = await fetch(base + '/api/sales/' + query, {headers:{Authorization:'Bearer '+auth.access_token}});
      const body = await response.json();
      evidence.cases.push({query,expected:400,actual:response.status,pass:response.status===400,code:body.code});
    }
  }
  const host = String(process.env.DATABRICKS_HOST || '').replace(/\/$/,'');
  const id = process.env.DATABRICKS_SQL_WAREHOUSE_ID, token = process.env.DATABRICKS_TOKEN;
  if (host && id && token) {
    const response = await fetch(host + '/api/2.0/sql/warehouses/' + encodeURIComponent(id), {headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
    const body = await response.json();
    evidence.warehouse = {http_status:response.status,state:body.state || null,error_code:body.error_code || null};
    evidence.live_diagnostics = {status:'not_verified',reason:body.state === 'RUNNING' ? 'Metadata ready; live SQL acceptance not executed by this boundary probe' : 'Configured warehouse is not RUNNING; analytical execution may change compute state'};
  }
  fs.writeFileSync(path.join(__dirname,'live-boundary-check.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({login_status:evidence.login_status,validation_pass:evidence.cases.filter(row=>row.pass).length,validation_total:evidence.cases.length,failures:evidence.cases.filter(row=>!row.pass),warehouse:evidence.warehouse},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
