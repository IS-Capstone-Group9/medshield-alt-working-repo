// Runs the real gateway solver on a JSON {body, shortlist} read from stdin; prints the result JSON.
// Launch with: node --import <backend tsx loader> frontend/e2e/support/solve-planning.cjs
const { solvePlanningScenario } = require('../../../backend/src/planningScenario.ts')
let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { input += chunk })
process.stdin.on('end', () => {
  const { body, shortlist } = JSON.parse(input)
  process.stdout.write(JSON.stringify(solvePlanningScenario(body, shortlist)))
})
