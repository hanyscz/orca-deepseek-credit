import assert from 'node:assert/strict'
import test from 'node:test'
import { balancesToShow } from '../src/worker.ts'

const cny = { currency: 'CNY', total_balance: '12.34' }
const usd = { currency: 'USD', total_balance: '5.00' }
const emptyUsd = { currency: 'USD', total_balance: '0.00' }

test('an empty USD row does not hide funded CNY', () => {
  assert.deepEqual(balancesToShow([cny, emptyUsd]), [cny])
})

test('funded USD still takes precedence', () => {
  assert.deepEqual(balancesToShow([cny, usd]), [usd])
})

test('keep every row when none are funded', () => {
  const rows = [{ ...cny, total_balance: '0.00' }, emptyUsd]
  assert.deepEqual(balancesToShow(rows), rows)
})
