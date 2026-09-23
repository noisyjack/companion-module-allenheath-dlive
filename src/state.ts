/**
 * Cache of dLive state learned from messages received from the console.
 * Used by feedbacks to reflect the console's current state on buttons.
 */
export class DliveState {
	private inputToGroupAuxOn = new Map<string, boolean>()

	/**
	 * Updates the cached state from a decoded dLive event
	 * @param event - The decoded event
	 */
	applyEvent(event: DLiveEvent): void {
		switch (event.type) {
			case 'input_to_group_aux_on': {
				const { channelNo, destinationChannelType, destinationChannelNo, on } = event
				this.inputToGroupAuxOn.set(inputToGroupAuxKey(channelNo, destinationChannelType, destinationChannelNo), on)
				break
			}
		}
	}

	/**
	 * @returns Whether the input is sent to the group / aux / matrix, or undefined if not yet known
	 */
	getInputToGroupAuxOn(
		channelNo: number,
		destinationChannelType: ChannelType,
		destinationChannelNo: number,
	): boolean | undefined {
		return this.inputToGroupAuxOn.get(inputToGroupAuxKey(channelNo, destinationChannelType, destinationChannelNo))
	}

	/**
	 * Forgets all cached state, e.g. when the connection to the console is re-established
	 */
	clear(): void {
		this.inputToGroupAuxOn.clear()
	}
}

const inputToGroupAuxKey = (channelNo: number, destinationChannelType: ChannelType, destinationChannelNo: number) =>
	`${channelNo}:${destinationChannelType}:${destinationChannelNo}`
