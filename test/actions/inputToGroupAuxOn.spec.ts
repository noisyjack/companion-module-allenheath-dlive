import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import {
	INPUT_CHANNEL_COUNT,
	MONO_AUX_COUNT,
	MONO_GROUP_COUNT,
	STEREO_AUX_COUNT,
	STEREO_GROUP_COUNT,
	SYSEX_HEADER,
} from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { getMidiOffsetsForChannelType } from '../../src/utils/index.js'
import { InputToGroupAuxOnAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('inputToGroupAuxOn action', () => {
	let moduleInstance: MockModuleInstance
	let sendMidiToDliveSpy: jest.SpyInstance

	beforeAll(() => {
		moduleInstance = new MockModuleInstance({})
		sendMidiToDliveSpy = jest.spyOn(moduleInstance, 'sendMidiToDlive')
		UpdateActions(moduleInstance as unknown as ModuleInstance)
	})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	const baseAction = {
		options: {
			dca: 0,
			fxReturn: 0,
			input: 0,
			main: 0,
			monoAux: 0,
			stereoAux: 0,
			monoFxSend: 0,
			stereoFxSend: 0,
			monoGroup: 0,
			stereoGroup: 0,
			stereoMatrix: 0,
			monoMatrix: 0,
			muteGroup: 0,
			stereoUfxReturn: 0,
			stereoUfxSend: 0,
			destinationDca: 0,
			destinationFxReturn: 0,
			destinationInput: 0,
			destinationMain: 0,
			destinationMonoAux: 0,
			destinationStereoAux: 0,
			destinationMonoFxSend: 0,
			destinationStereoFxSend: 0,
			destinationMonoGroup: 0,
			destinationStereoGroup: 0,
			destinationStereoMatrix: 0,
			destinationMonoMatrix: 0,
			destinationMuteGroup: 0,
			destinationStereoUfxReturn: 0,
			destinationStereoUfxSend: 0,
			level: 0,
		},
		actionId: '',
		controlId: '',
		id: '',
	}

	// Test destination channel types (only group/aux can receive from input)
	const destinationChannelTestCases: [ChannelType, number][] = [
		['mono_group', MONO_GROUP_COUNT],
		['stereo_group', STEREO_GROUP_COUNT],
		['mono_aux', MONO_AUX_COUNT],
		['stereo_aux', STEREO_AUX_COUNT],
	]

	// Test first and last input channel
	const testInputChannels = [1, INPUT_CHANNEL_COUNT]

	// Test set on and set off modes, with the value each should send
	const testModes: [InputToGroupAuxMode, boolean][] = [
		['on', true],
		['off', false],
	]

	describe.each(testInputChannels)('input channel %s', (inputChannelNo: number) => {
		describe.each(destinationChannelTestCases)(
			'destination channel %s',
			(destinationChannelType, destinationChannelCount) => {
				// Test first and last destination channel
				const testDestinationChannels = [1, destinationChannelCount]

				describe.each(testDestinationChannels)('destination channel %s', (destinationChannelNo: number) => {
					it.each(testModes)('mode=%s', (mode, on) => {
						const inputChannelIndex = inputChannelNo - 1
						const destinationChannelIndex = destinationChannelNo - 1

						const inputToGroupAuxOnAction: InputToGroupAuxOnAction = {
							...baseAction,
							options: {
								...baseAction.options,
								input: inputChannelIndex,
								destinationChannelType,
								[camelCase(`destination_${destinationChannelType}`)]: destinationChannelIndex,
								mode,
							},
						}

						void moduleInstance.actionDefinitions.inputToGroupAuxOn?.callback?.(
							inputToGroupAuxOnAction as CompanionActionEvent,
							{} as CompanionActionContext,
						)

						const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType('input')
						const { midiChannelOffset: destinationMidiChannelOffset, midiNoteOffset: destinationMidiNoteOffset } =
							getMidiOffsetsForChannelType(destinationChannelType)

						expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
						expect(sendMidiToDliveSpy).toHaveBeenCalledWith([
							...SYSEX_HEADER,
							midiChannelOffset,
							0xe,
							inputChannelIndex + midiNoteOffset,
							destinationMidiChannelOffset,
							destinationChannelIndex + destinationMidiNoteOffset,
							on ? 0x40 : 0x00,
							0xf7,
						])
					})
				})
			},
		)
	})

	describe('mode=toggle', () => {
		const toggleAction = {
			...baseAction,
			options: { ...baseAction.options, destinationChannelType: 'mono_aux', mode: 'toggle' },
		} as unknown as CompanionActionEvent

		const triggerToggle = (): void | Promise<void> =>
			moduleInstance.actionDefinitions.inputToGroupAuxOn?.callback?.(toggleAction, {} as CompanionActionContext)

		// The on / off value is the byte before the closing 0xf7
		const sentValue = (message: number[]) => message[message.length - 2]
		const lastSentValue = () => sentValue((sendMidiToDliveSpy.mock.lastCall as [number[]])[0])

		beforeEach(() => {
			moduleInstance.state.clear()
		})

		it('turns the assignment on when its state is not yet known', () => {
			void triggerToggle()
			expect(lastSentValue()).toBe(0x40)
		})

		it('turns the assignment off when it is on', () => {
			moduleInstance.state.applyEvent({
				type: 'input_to_group_aux_on',
				channelNo: 0,
				destinationChannelType: 'mono_aux',
				destinationChannelNo: 0,
				on: true,
			})
			void triggerToggle()
			expect(lastSentValue()).toBe(0x00)
		})

		it('alternates on each press', () => {
			void triggerToggle()
			void triggerToggle()
			void triggerToggle()
			expect(sendMidiToDliveSpy.mock.calls.map(([message]: [number[]]) => sentValue(message))).toEqual([
				0x40, 0x00, 0x40,
			])
		})
	})
})
