import { DliveState } from '../state.js'

const event = (overrides: Partial<DLiveInputToGroupAuxOnEvent> = {}): DLiveInputToGroupAuxOnEvent => ({
	type: 'input_to_group_aux_on',
	channelNo: 0,
	destinationChannelType: 'mono_aux',
	destinationChannelNo: 0,
	on: true,
	...overrides,
})

describe('DliveState', () => {
	let state: DliveState

	beforeEach(() => {
		state = new DliveState()
	})

	it('returns undefined for an input to group / aux assignment it has not received', () => {
		expect(state.getInputToGroupAuxOn(0, 'mono_aux', 0)).toBeUndefined()
	})

	it('stores the latest input to group / aux on state', () => {
		state.applyEvent(event({ on: true }))
		expect(state.getInputToGroupAuxOn(0, 'mono_aux', 0)).toBe(true)

		state.applyEvent(event({ on: false }))
		expect(state.getInputToGroupAuxOn(0, 'mono_aux', 0)).toBe(false)
	})

	it.each([
		['input', { channelNo: 1 }],
		['destination type', { destinationChannelType: 'stereo_aux' as const }],
		['destination number', { destinationChannelNo: 1 }],
	])('keeps assignments with a different %s separate', (_, overrides) => {
		state.applyEvent(event({ on: true }))
		state.applyEvent(event({ ...overrides, on: false }))
		expect(state.getInputToGroupAuxOn(0, 'mono_aux', 0)).toBe(true)
	})

	it('forgets everything on clear', () => {
		state.applyEvent(event({ on: true }))
		state.clear()
		expect(state.getInputToGroupAuxOn(0, 'mono_aux', 0)).toBeUndefined()
	})
})
