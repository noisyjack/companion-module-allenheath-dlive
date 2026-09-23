import { CompanionMigrationAction, CompanionUpgradeContext } from '@companion-module/base'

import { UpgradeScripts } from '../upgrades.js'

const inputToGroupAuxOnAction = (options: CompanionMigrationAction['options']): CompanionMigrationAction => ({
	id: 'action-id',
	controlId: 'control-id',
	actionId: 'inputToGroupAuxOn',
	options,
})

const runUpgrade = (actions: CompanionMigrationAction[]) =>
	UpgradeScripts[0]({} as CompanionUpgradeContext<Record<string, unknown>>, {
		config: null,
		secrets: null,
		actions,
		feedbacks: [],
	})

describe('upgrade: inputToGroupAuxOn on checkbox to mode dropdown', () => {
	it.each([
		[true, 'on'],
		[false, 'off'],
	])('converts on=%s to mode=%s', (on, mode) => {
		const { updatedActions } = runUpgrade([inputToGroupAuxOnAction({ input: 3, on })])
		expect(updatedActions).toEqual([inputToGroupAuxOnAction({ input: 3, mode })])
	})

	it('leaves actions that already have a mode alone', () => {
		const { updatedActions } = runUpgrade([inputToGroupAuxOnAction({ input: 3, mode: 'toggle' })])
		expect(updatedActions).toEqual([])
	})

	it('leaves other actions alone', () => {
		const { updatedActions } = runUpgrade([{ ...inputToGroupAuxOnAction({ on: true }), actionId: 'mute' }])
		expect(updatedActions).toEqual([])
	})
})
