import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource-variable/inter';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import LiveBank from './LiveBank';
import bank from './bank-config';
import theme from './theme';
import './galaxy.css';

document.title = bank.name + ' | Account portal';
document.documentElement.dataset.bank = bank.theme;
const switchUrl = 'https://sriramtpsiog.github.io/SharedDB/';
createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}><CssBaseline /><LiveBank bank={bank} switchUrl={switchUrl} /></ThemeProvider>,
);
