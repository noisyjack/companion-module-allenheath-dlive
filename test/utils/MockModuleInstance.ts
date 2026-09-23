import { CompanionActionDefinitions, CompanionFeedbackDefinitions, TCPHelper } from '@companion-module/base'

import { ModuleInstance } from '../../src/main.js'

export class MockModuleInstance extends ModuleInstance {
	actionDefinitions: CompanionActionDefinitions = {}
	feedbackDefinitions: CompanionFeedbackDefinitions = {}

	constructor(internal: unknown) {
		super(internal)
		this.midiSocket = { send: jest.fn() } as unknown as TCPHelper
	}

	setActionDefinitions(actionDefinitions: CompanionActionDefinitions): void {
		this.actionDefinitions = actionDefinitions
	}

	setFeedbackDefinitions(feedbackDefinitions: CompanionFeedbackDefinitions): void {
		this.feedbackDefinitions = feedbackDefinitions
	}

	checkFeedbacks = jest.fn()

	sendMidiToDlive(_midiData: number[]): void {
		return
	}

	log(): void {
		return
	}
}
