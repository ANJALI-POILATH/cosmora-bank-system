import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import App from './app/App';
import bank from './bank-config';

document.title = bank.name + ' | Banking beyond the stars';
const theme = createTheme({
  palette: {
    primary: { main: '#e8625c', contrastText: '#fff' },
    secondary: { main: '#3a1d3f' },
    success: { main: '#1f8a5b' },
    warning: { main: '#c7791c' },
    error: { main: '#c8384f' },
    text: { primary: '#2a1630', secondary: '#77627a' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter Variable", Inter, sans-serif',
    button: { textTransform: 'none', fontWeight: 650 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999, paddingInline: 20 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12, background: '#fff' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
  },
});
createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}><CssBaseline /><App bank={bank} /></ThemeProvider>,
);
