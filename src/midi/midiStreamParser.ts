const SYSEX_START = 0xf0
const SYSEX_END = 0xf7

/**
 * Splits the raw TCP byte stream from the dLive into complete MIDI messages.
 * TCP gives no guarantee that one chunk equals one message, so partial
 * messages are buffered until the rest arrives.
 *
 * Currently only SysEx messages (F0 ... F7) are extracted; all other bytes are ignored.
 */
export class MidiStreamParser {
	private pendingSysex: number[] | null = null

	/**
	 * Feeds a chunk of received data into the parser
	 * @param chunk - The received data
	 * @returns Any messages completed by this chunk, in order of arrival
	 */
	push(chunk: Buffer): number[][] {
		const messages: number[][] = []

		for (const byte of chunk) {
			if (byte === SYSEX_START) {
				this.pendingSysex = [byte]
			} else if (this.pendingSysex) {
				this.pendingSysex.push(byte)
				if (byte === SYSEX_END) {
					messages.push(this.pendingSysex)
					this.pendingSysex = null
				}
			}
		}

		return messages
	}

	/**
	 * Discards any partially received message, e.g. after a reconnect
	 */
	reset(): void {
		this.pendingSysex = null
	}
}
