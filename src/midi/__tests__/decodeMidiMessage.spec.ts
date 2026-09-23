import { decodeMidiMessage } from '../decodeMidiMessage.js'

const HEADER = [0xf0, 0x00, 0x00, 0x1a, 0x50, 0x10, 0x01, 0x00]
const MIDI_CHANNEL_12 = 0x0b

const inputToGroupAuxOn = (n: number, ch: number, sndN: number, sndCh: number, v: number): number[] => [
	...HEADER,
	n,
	0x0e,
	ch,
	sndN,
	sndCh,
	v,
	0xf7,
]

describe('decodeMidiMessage', () => {
	describe('Input to Group / Aux On', () => {
		it.each([
			// Examples captured from a dLive on MIDI channel 12
			['Input 1 -> Mono Aux 1 on (captured)', [0x0b, 0x00, 0x0d, 0x00, 0x7f], 0, 'mono_aux', 0, true],
			['Input 1 -> Mono Aux 1 off (captured)', [0x0b, 0x00, 0x0d, 0x00, 0x3f], 0, 'mono_aux', 0, false],
			['lowest on value', [0x0b, 0x00, 0x0d, 0x00, 0x40], 0, 'mono_aux', 0, true],
			['lowest off value', [0x0b, 0x00, 0x0d, 0x00, 0x00], 0, 'mono_aux', 0, false],
			['Input 128 -> Mono Aux 62', [0x0b, 0x7f, 0x0d, 0x3d, 0x7f], 127, 'mono_aux', 61, true],
			['Input 3 -> Stereo Aux 2', [0x0b, 0x02, 0x0d, 0x41, 0x7f], 2, 'stereo_aux', 1, true],
			['Input 4 -> Mono Group 5', [0x0b, 0x03, 0x0c, 0x04, 0x7f], 3, 'mono_group', 4, true],
			['Input 5 -> Stereo Group 1', [0x0b, 0x04, 0x0c, 0x40, 0x7f], 4, 'stereo_group', 0, true],
			['Input 6 -> Mono Matrix 7', [0x0b, 0x05, 0x0e, 0x06, 0x7f], 5, 'mono_matrix', 6, true],
			['Input 7 -> Stereo Matrix 3', [0x0b, 0x06, 0x0e, 0x42, 0x3f], 6, 'stereo_matrix', 2, false],
		])('decodes %s', (_, [n, ch, sndN, sndCh, v], channelNo, destinationChannelType, destinationChannelNo, on) => {
			expect(decodeMidiMessage(inputToGroupAuxOn(n, ch, sndN, sndCh, v), MIDI_CHANNEL_12)).toEqual({
				type: 'input_to_group_aux_on',
				channelNo,
				destinationChannelType,
				destinationChannelNo,
				on,
			})
		})

		it('decodes relative to the configured base MIDI channel', () => {
			expect(decodeMidiMessage(inputToGroupAuxOn(0x00, 0x05, 0x02, 0x03, 0x7f), 0x00)).toEqual({
				type: 'input_to_group_aux_on',
				channelNo: 5,
				destinationChannelType: 'mono_aux',
				destinationChannelNo: 3,
				on: true,
			})
		})

		it.each([
			['source is not on the input MIDI channel', [0x0c, 0x00, 0x0d, 0x00, 0x7f]],
			['destination is an FX / main channel (N + 4)', [0x0b, 0x00, 0x0f, 0x00, 0x7f]],
			['destination is on the input MIDI channel (N + 0)', [0x0b, 0x00, 0x0b, 0x00, 0x7f]],
			['destination note is between mono and stereo ranges', [0x0b, 0x00, 0x0d, 0x3e, 0x7f]],
			['destination note is beyond the stereo range', [0x0b, 0x00, 0x0d, 0x60, 0x7f]],
		])('returns null when %s', (_, [n, ch, sndN, sndCh, v]) => {
			expect(decodeMidiMessage(inputToGroupAuxOn(n, ch, sndN, sndCh, v), MIDI_CHANNEL_12)).toBeNull()
		})

		it('returns null when the message is on a different base MIDI channel', () => {
			expect(decodeMidiMessage(inputToGroupAuxOn(0x0b, 0x00, 0x0d, 0x00, 0x7f), 0x00)).toBeNull()
		})
	})

	it('returns null for an unrecognised SysEx command', () => {
		// Aux send level (0x0D) - not decoded yet
		expect(decodeMidiMessage([...HEADER, 0x0b, 0x0d, 0x00, 0x0d, 0x00, 0x6b, 0xf7], MIDI_CHANNEL_12)).toBeNull()
	})

	it('returns null for SysEx from another manufacturer', () => {
		const otherHeader = [0xf0, 0x00, 0x00, 0x1a, 0x50, 0x11, 0x01, 0x00]
		expect(decodeMidiMessage([...otherHeader, 0x0b, 0x0e, 0x00, 0x0d, 0x00, 0x7f, 0xf7], MIDI_CHANNEL_12)).toBeNull()
	})

	it('returns null for a message of the wrong length', () => {
		expect(decodeMidiMessage([...HEADER, 0x0b, 0x0e, 0x00, 0x0d, 0x7f, 0xf7], MIDI_CHANNEL_12)).toBeNull()
	})
})
