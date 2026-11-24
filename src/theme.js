import { alpha, createTheme } from '@mui/material';

const serif = '"Cormorant Garamond", "Times New Roman", serif';
const sans = '"Inter Variable", Inter, system-ui, sans-serif';
const violet = '#a78bfa';

// Shared "glass panel" look used for cards across the portal.
export const glass = {
  background: 'linear-gradient(160deg, rgba(46, 26, 96, 0.55), rgba(14, 8, 34, 0.62))',
  border: '1px solid rgba(196, 181, 253, 0.16)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: '22px',
  boxShadow: '0 20px 60px rgba(4, 0, 20, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: violet, light: '#c4b5fd', dark: '#7c3aed', contrastText: '#12082b' },
    secondary: { main: '#f6b49a', contrastText: '#2a1020' },
    success: { main: '#6ee7b7' },
    error: { main: '#fb7185' },
    warning: { main: '#fcd34d' },
    info: { main: '#a5b4fc' },
    background: { default: '#07040f', paper: '#150c2c' },
    text: { primary: '#efe9ff', secondary: '#b4a8d8' },
    divider: 'rgba(196, 181, 253, 0.14)',
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: sans,
    h1: { fontFamily: serif, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 },
    h2: { fontFamily: serif, fontWeight: 600, lineHeight: 1.05 },
    h3: { fontFamily: serif, fontWeight: 600 },
    h4: { fontFamily: serif, fontWeight: 600 },
    h5: { fontFamily: serif, fontWeight: 600 },
    h6: { fontWeight: 650, letterSpacing: '0.01em' },
    overline: { letterSpacing: '0.28em', fontWeight: 600, fontSize: '0.72rem' },
    button: { textTransform: 'none', fontWeight: 650, letterSpacing: '0.01em' },
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: '#07040f' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 22, transition: 'all .25s ease' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #d8ccff 0%, #a78bfa 45%, #7c3aed 100%)',
          boxShadow: '0 0 24px rgba(139, 92, 246, 0.45)',
          '&:hover': { boxShadow: '0 0 38px rgba(167, 139, 250, 0.75)', transform: 'translateY(-1px)' },
          '&.Mui-disabled': { background: alpha(violet, 0.25), color: alpha('#fff', 0.5) },
        },
        outlined: {
          borderColor: alpha(violet, 0.45),
          '&:hover': { borderColor: violet, background: alpha(violet, 0.1), boxShadow: '0 0 20px rgba(167,139,250,.25)' },
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          background: 'rgba(10, 5, 26, 0.55)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(196, 181, 253, 0.22)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(196, 181, 253, 0.5)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { boxShadow: '0 0 0 4px rgba(167,139,250,.15)' },
        },
      },
    },
    MuiDialog: { styleOverrides: { paper: { ...glass, background: 'linear-gradient(160deg, #23154a, #0f0824)' } } },
    MuiMenu: { styleOverrides: { paper: { background: '#180e33', border: '1px solid rgba(196,181,253,.16)' } } },
    MuiTooltip: { styleOverrides: { tooltip: { background: '#2a1a57', border: '1px solid rgba(196,181,253,.25)', fontSize: 12 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 14, backdropFilter: 'blur(10px)' } } },
  },
});

export default theme;
