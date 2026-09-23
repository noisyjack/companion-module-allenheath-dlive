import { CompanionStaticUpgradeScript } from '@companion-module/base'

/**
 * Converts the Input to Group / Aux / Matrix action's "On" checkbox into the "Mode" dropdown
 */
const inputToGroupAuxOnCheckboxToMode: CompanionStaticUpgradeScript<Record<string, unknown>> = (_context, props) => ({
	updatedConfig: null,
	updatedActions: props.actions
		.filter((action) => action.actionId === 'inputToGroupAuxOn' && typeof action.options.on === 'boolean')
		.map((action) => {
			const { on, ...options } = action.options
			return { ...action, options: { ...options, mode: on ? 'on' : 'off' } }
		}),
	updatedFeedbacks: [],
})

export const UpgradeScripts: CompanionStaticUpgradeScript<Record<string, unknown>>[] = [inputToGroupAuxOnCheckboxToMode]
