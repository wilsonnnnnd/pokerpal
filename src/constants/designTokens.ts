import { Palette } from './color.palette';

// Central design tokens derived from UI-UX.md
export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 30,
};

export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 999,
};

export const FontSize = {
    h1: 26,
    h2: 24,
    h3: 18,
    body: 16,
    small: 12,
};

export const Elevation = {
    card: 5,
    overlay: 8,
};

export const Shadow = {
    light: Palette.shadowLight,
    dark: Palette.shadowDark,
};

export const Button = {
    radius: Radius.md,
    paddingVertical: 14,
};

export default {
    Spacing,
    Radius,
    FontSize,
    Elevation,
    Shadow,
    Button,
};
