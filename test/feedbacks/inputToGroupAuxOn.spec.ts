import { CompanionFeedbackBooleanEvent, CompanionFeedbackContext } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { CHANNEL_TYPES } from '../../src/constants.js'
import { UpdateFeedbacks } from '../../src/feedbacks.js'
import { ModuleInstance } from '../../src/main.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

const HEADER = [0xf0, 0x00, 0x00, 0x1a, 0x50, 0x10, 0x01, 0x00]
// Captured from a dLive on MIDI channel 12: Input 1 -> Aux 1 on / off
const INPUT_1_TO_AUX_1_ON = [...HEADER, 0x0b, 0x0e, 0x00, 0x0d, 0x00, 0x7f, 0xf7]
const INPUT_1_TO_AUX_1_OFF = [...HEADER, 0x0b, 0x0e, 0x00, 0x0d, 0x00, 0x3f, 0xf7]

const feedbackEvent = (
	input: number,
	destinationChannelType: ChannelType,
	destinationChannelNo: number,
): CompanionFeedbackBooleanEvent => ({
	type: 'boolean',
	id: 'feedback-id',
	controlId: 'control-id',
	feedbackId: 'inputToGroupAuxOn',
	options: {
		// Companion sends every option, including the hidden per-type dropdowns
		...Object.fromEntries(CHANNEL_TYPES.map((type) => [camelCase(`destination_${type}`), 0])),
		input,
		destinationChannelType,
		[camelCase(`destination_${destinationChannelType}`)]: destinationChannelNo,
	},
})

describe('inputToGroupAuxOn feedback', () => {
	let moduleInstance: MockModuleInstance
	let sendMidiToDliveSpy: jest.SpyInstance

	const evaluate = (feedback: CompanionFeedbackBooleanEvent) => {
		const definition = moduleInstance.feedbackDefinitions.inputToGroupAuxOn
		if (definition?.type !== 'boolean') throw new Error('inputToGroupAuxOn is not a boolean feedback')
		return definition.callback(feedback, {} as CompanionFeedbackContext)
	}

	const subscribe = (feedback: CompanionFeedbackBooleanEvent) =>
		moduleInstance.feedbackDefinitions.inputToGroupAuxOn?.subscribe?.(feedback, {} as CompanionFeedbackContext)

	beforeEach(() => {
		moduleInstance = new MockModuleInstance({})
		moduleInstance.config = { host: '192.168.1.70', midiPort: 51325, midiChannel: 11 } // MIDI channel 12
		sendMidiToDliveSpy = jest.spyOn(moduleInstance, 'sendMidiToDlive')
		UpdateFeedbacks(moduleInstance as unknown as ModuleInstance)
	})

	describe('subscribe', () => {
		it.each<[string, number, ChannelType, number, number[]]>([
			['Input 1 -> Mono Aux 1', 0, 'mono_aux', 0, [0x0b, 0x05, 0x0f, 0x0e, 0x00, 0x0d, 0x00]],
			['Input 10 -> Stereo Group 2', 9, 'stereo_group', 1, [0x0b, 0x05, 0x0f, 0x0e, 0x09, 0x0c, 0x41]],
			['Input 128 -> Mono Matrix 62', 127, 'mono_matrix', 61, [0x0b, 0x05, 0x0f, 0x0e, 0x7f, 0x0e, 0x3d]],
		])('requests the current state of %s from the dLive', (_, input, destinationType, destinationNo, body) => {
			void subscribe(feedbackEvent(input, destinationType, destinationNo))
			expect(sendMidiToDliveSpy).toHaveBeenCalledWith([...HEADER, ...body, 0xf7])
		})
	})

	describe('callback', () => {
		it('is off before any state has been received', () => {
			expect(evaluate(feedbackEvent(0, 'mono_aux', 0))).toBe(false)
		})

		it('follows assignment changes received from the dLive', () => {
			moduleInstance.handleMidiData(Buffer.from(INPUT_1_TO_AUX_1_ON))
			expect(evaluate(feedbackEvent(0, 'mono_aux', 0))).toBe(true)

			moduleInstance.handleMidiData(Buffer.from(INPUT_1_TO_AUX_1_OFF))
			expect(evaluate(feedbackEvent(0, 'mono_aux', 0))).toBe(false)
		})

		it('only reflects the matching input and destination', () => {
			moduleInstance.handleMidiData(Buffer.from(INPUT_1_TO_AUX_1_ON))
			expect(evaluate(feedbackEvent(1, 'mono_aux', 0))).toBe(false)
			expect(evaluate(feedbackEvent(0, 'mono_aux', 1))).toBe(false)
			expect(evaluate(feedbackEvent(0, 'stereo_aux', 0))).toBe(false)
		})

		it('handles a message split across TCP chunks', () => {
			moduleInstance.handleMidiData(Buffer.from(INPUT_1_TO_AUX_1_ON.slice(0, 9)))
			moduleInstance.handleMidiData(Buffer.from(INPUT_1_TO_AUX_1_ON.slice(9)))
			expect(evaluate(feedbackEvent(0, 'mono_aux', 0))).toBe(true)
		})
	})

	describe('handleMidiData', () => {
		it('asks Companion to re-check the feedback when an assignment message arrives', () => {
			moduleInstance.handleMidiData(Buffer.from(INPUT_1_TO_AUX_1_ON))
			expect(moduleInstance.checkFeedbacks).toHaveBeenCalledWith('inputToGroupAuxOn')
		})

		it('does not re-check feedbacks for unrecognised messages', () => {
			moduleInstance.handleMidiData(Buffer.from([0x9b, 0x00, 0x7f, 0x00, 0x00]))
			expect(moduleInstance.checkFeedbacks).not.toHaveBeenCalled()
		})
	})
})
