import { MidiStreamParser } from '../midiStreamParser.js'

const AUX_ON = [0xf0, 0x00, 0x00, 0x1a, 0x50, 0x10, 0x01, 0x00, 0x0b, 0x0e, 0x00, 0x0d, 0x00, 0x7f, 0xf7]
const AUX_OFF = [0xf0, 0x00, 0x00, 0x1a, 0x50, 0x10, 0x01, 0x00, 0x0b, 0x0e, 0x00, 0x0d, 0x00, 0x3f, 0xf7]

describe('MidiStreamParser', () => {
	let parser: MidiStreamParser

	beforeEach(() => {
		parser = new MidiStreamParser()
	})

	it('returns a complete SysEx message received in a single chunk', () => {
		expect(parser.push(Buffer.from(AUX_ON))).toEqual([AUX_ON])
	})

	it('returns multiple SysEx messages received in a single chunk', () => {
		expect(parser.push(Buffer.from([...AUX_ON, ...AUX_OFF]))).toEqual([AUX_ON, AUX_OFF])
	})

	it('reassembles a SysEx message split across chunks', () => {
		expect(parser.push(Buffer.from(AUX_ON.slice(0, 6)))).toEqual([])
		expect(parser.push(Buffer.from(AUX_ON.slice(6)))).toEqual([AUX_ON])
	})

	it('ignores bytes outside of SysEx messages', () => {
		const noteOn = [0x9b, 0x00, 0x7f, 0x00, 0x00]
		const nrpn = [0xbb, 0x63, 0x00, 0x62, 0x18, 0x06, 0x7f]
		expect(parser.push(Buffer.from([...noteOn, ...AUX_ON, ...nrpn]))).toEqual([AUX_ON])
	})

	it('discards an unterminated SysEx message when a new one starts', () => {
		const truncated = AUX_ON.slice(0, 10)
		expect(parser.push(Buffer.from([...truncated, ...AUX_OFF]))).toEqual([AUX_OFF])
	})

	it('drops any partial message on reset', () => {
		parser.push(Buffer.from(AUX_ON.slice(0, 6)))
		parser.reset()
		expect(parser.push(Buffer.from(AUX_ON.slice(6)))).toEqual([])
	})
})
