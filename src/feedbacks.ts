import { combineRgb } from '@companion-module/base'
import { camelCase } from 'lodash/fp'

import { INPUT_CHANNEL_COUNT } from './constants.js'
import { ModuleInstance } from './main.js'
import { getChannelSelectOptions, makeDropdownChoices } from './utils/index.js'
import * as validators from './validators/index.js'

const camelCaseStringLiteral = <const S extends string>(snakeCaseString: S): SnakeToCamel<S> =>
	camelCase(snakeCaseString) as SnakeToCamel<S>

export const UpdateFeedbacks = (companionModule: ModuleInstance): void => {
	companionModule.setFeedbackDefinitions({
		inputToGroupAuxOn: {
			type: 'boolean',
			name: 'Input to Group / Aux / Matrix',
			description: 'Indicate whether an input is sent to a group / aux / matrix',
			defaultStyle: {
				bgcolor: combineRgb(0, 204, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'input',
					default: 0,
					choices: makeDropdownChoices('Input Channel', INPUT_CHANNEL_COUNT),
					minChoicesForSearch: 0,
				},
				...getChannelSelectOptions({
					prefix: 'destination',
					include: ['mono_group', 'stereo_group', 'mono_aux', 'stereo_aux', 'mono_matrix', 'stereo_matrix'],
				}),
			],
			callback: (feedback) => {
				const { options } = validators.parseInputToGroupAuxOnFeedback(feedback)
				return (
					companionModule.state.getInputToGroupAuxOn(
						options.input,
						options.destinationChannelType,
						options[camelCaseStringLiteral(`destination_${options.destinationChannelType}`)],
					) ?? false
				)
			},
			subscribe: (feedback) => {
				const { options } = validators.parseInputToGroupAuxOnFeedback(feedback)
				companionModule.processCommand({
					command: 'get_input_to_group_aux_on',
					params: {
						channelNo: options.input,
						destinationChannelType: options.destinationChannelType,
						destinationChannelNo: options[camelCaseStringLiteral(`destination_${options.destinationChannelType}`)],
					},
				})
			},
		},
	})
}
