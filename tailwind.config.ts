import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Material Design 3 inspired tokens
                primary: {
                    light: "#1A73E8", // Google Blue
                    dark: "#8AB4F8",
                },
                surface: {
                    light: "#FFFFFF",
                    dark: "#1E1E1E",
                    variant: {
                        light: "#F1F3F4",
                        dark: "#2C2C2C",
                    }
                },
                onSurface: {
                    light: "#202124",
                    dark: "#E8EAED",
                    variant: {
                        light: "#5F6368",
                        dark: "#9AA0A6",
                    }
                },
                outline: {
                    light: "#747775",
                    dark: "#8E918F",
                }
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem', // Material rounded corners
            },
            boxShadow: {
                'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
                'elevation-2': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
            }
        },
    },
    plugins: [],
};
export default config;
