import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSurvey, susScore, summarizeSurveys, SurveyInputError} from '../src/acceptanceSurvey'

const ok = {sus: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], usefulness: [5, 4, 3], role: 'sales', comment: ' good '}

test('SUS scoring follows the standard formula', () => {
  assert.equal(susScore(ok.sus), 100)
  assert.equal(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0)
  assert.equal(susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50)
  assert.equal(susScore([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]), 75)
})

test('validates every answer and trims the comment', () => {
  assert.equal(parseSurvey(ok).comment, 'good')
  for (const bad of [{...ok, sus: ok.sus.slice(1)}, {...ok, sus: [...ok.sus.slice(1), 6]}, {...ok, usefulness: [1, 2]}, {...ok, role: 'boss'},
    {...ok, comment: 'x'.repeat(1001)}, {...ok, extra: 1}, null]) assert.throws(() => parseSurvey(bad), SurveyInputError)
})

test('summary reports mean SUS, benchmark count and ignores malformed rows', () => {
  const s = summarizeSurveys([JSON.stringify(parseSurvey(ok)), JSON.stringify({...ok, sus: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], comment: ''}), 'not json'])
  assert.equal(s.responses, 2); assert.equal(s.sus_mean, 75); assert.equal(s.at_or_above_benchmark, 1)
  assert.equal(s.usefulness_mean[0].mean, 5); assert.deepEqual(s.comments, ['good'])
  assert.equal(summarizeSurveys([]).sus_mean, null)
})
