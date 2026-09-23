import { isEqual } from 'lodash/fp'

import { CHANNEL_COUNTS, SYSEX_HEADER } from '../constants.js'
import { getMidiOffsetsForChannelType } from '../utils/index.js'

const INPUT_TO_GROUP_AUX_ON_COMMAND = 0x0e
const GROUP_AUX_MATRIX_TYPES: ChannelType[] = [
	'mono_group',
	'stereo_group',
	'mono_aux',
	'stereo_aux',
	'mono_matrix',
	'stereo_matrix',
]

/**
 * Finds the channel type and number addressed by a MIDI channel offset and note number,
 * i.e. the reverse of getMidiOffsetsForChannelType
 * @param candidates - The channel types the message could refer to
 * @param midiChannelOffset - The received MIDI channel minus the base MIDI channel
 * @param note - The received note number
 * @returns The channel type and number, or null if no candidate matches
 */
const findChannel = (
	candidates: ChannelType[],
	midiChannelOffset: number,
	note: number,
): { channelType: ChannelType; channelNo: number } | null => {
	for (const channelType of candidates) {
		const offsets = getMidiOffsetsForChannelType(channelType)
		const channelNo = note - offsets.midiNoteOffset
		if (
			offsets.midiChannelOffset === midiChannelOffset &&
			channelNo >= 0 &&
			channelNo < CHANNEL_COUNTS[channelType]
		) {
			return { channelType, channelNo }
		}
	}
	return null
}

/**
 * Decodes a SysEx message received from the dLive
 * @param message - The complete SysEx message, including F0 and F7
 * @param baseMidiChannel - The configured base MIDI channel (N)
 * @returns The decoded event, or null if the message is not recognised
 */
const decodeSysex = (message: number[], baseMidiChannel: number): DLiveEvent | null => {
	if (!isEqual(message.slice(0, SYSEX_HEADER.length), SYSEX_HEADER)) {
		return null
	}
	const body = message.slice(SYSEX_HEADER.length, -1)
	const [midiChannel, command] = body

	if (command === INPUT_TO_GROUP_AUX_ON_COMMAND && body.length === 6) {
		const [, , channelNo, sendMidiChannel, sendNote, value] = body
		if (midiChannel !== baseMidiChannel + getMidiOffsetsForChannelType('input').midiChannelOffset) {
			return null
		}
		const destination = findChannel(GROUP_AUX_MATRIX_TYPES, sendMidiChannel - baseMidiChannel, sendNote)
		if (!destination) {
			return null
		}
		return {
			type: 'input_to_group_aux_on',
			channelNo,
			destinationChannelType: destination.channelType,
			destinationChannelNo: destination.channelNo,
			on: value >= 0x40,
		}
	}

	return null
}

/**
 * Decodes a complete MIDI message received from the dLive into an event
 * @param message - The complete MIDI message bytes
 * @param baseMidiChannel - The configured base MIDI channel (N)
 * @returns The decoded event, or null if the message is not recognised
 */
export const decodeMidiMessage = (message: number[], baseMidiChannel: number): DLiveEvent | null => {
	if (message[0] === 0xf0) {
		return decodeSysex(message, baseMidiChannel)
	}
	return null
}
