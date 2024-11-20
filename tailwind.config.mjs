/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
		colors:{
			'primary': 'colors.ctp-pink',
			'secondary': 'colors.ctp-mauve',
			'accent': 'ctp-yellow',
			'neutral': 'ctp-overlay0',
			'info': 'ctp-blue',
			'success': 'ctp-teal',
			'warning': 'ctp-peach',
			'error': 'ctp-red'
		},
	},
	plugins: [require("@catppuccin/tailwindcss")({
		prefix: "ctp",
		// defaultFlavour: "mocha",
	  })],
}
