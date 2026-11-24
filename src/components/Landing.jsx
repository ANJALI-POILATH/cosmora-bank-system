import { useState } from 'react';
import {
  Alert, AppBar, Box, Button, Chip, Collapse, Container, IconButton, InputAdornment, Link, Stack, TextField,
  Toolbar, Tooltip, Typography,
} from '@mui/material';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import ShieldMoonRoundedIcon from '@mui/icons-material/ShieldMoonRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LanRoundedIcon from '@mui/icons-material/LanRounded';
import Emblem from './Emblem';
import { glass } from '../theme';

const features = [
  { icon: BoltRoundedIcon, title: 'Instant Transfers', text: 'Move funds across the SharedBank switch in moments, with live status tracking.' },
  { icon: ShieldMoonRoundedIcon, title: 'Sealed Vault', text: 'Every request is signed with your session token and an idempotency key.' },
  { icon: HubRoundedIcon, title: 'Interbank Network', text: 'Reach every active bank in the directory, or send within Cosmora.' },
  { icon: InsightsRoundedIcon, title: 'Live Activity', text: 'Your balances and the latest 50 transfers refresh automatically.' },
  { icon: AutoAwesomeRoundedIcon, title: 'Loans & Portfolio', text: 'Plan EMIs, apply for loans and manage every account in one place.' },
];

const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function Logo({ bank }) {
  return <Stack direction="row" spacing={1.2} alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => scrollTo('top')}>
    <Emblem size={34} />
    <Box>
      <Typography sx={{ fontWeight: 750, letterSpacing: '0.22em', fontSize: 13, lineHeight: 1.1 }}>{bank.wordmark}</Typography>
      <Typography sx={{ fontSize: 10, letterSpacing: '0.3em', color: 'text.secondary' }}>INTERSTELLAR BANKING</Typography>
    </Box>
  </Stack>;
}

function FeatureCard({ feature, index, active, onSelect }) {
  const Icon = feature.icon;
  return <Box component="button" type="button" onClick={onSelect} aria-pressed={active} className="rise"
    sx={{
      all: 'unset', cursor: 'pointer', textAlign: 'center', p: 2.5, borderRadius: '22px', animationDelay: `${index * 90}ms`,
      transition: 'transform .3s ease, background .3s ease, box-shadow .3s ease',
      background: active ? 'rgba(124, 58, 237, 0.16)' : 'transparent',
      boxShadow: active ? '0 0 0 1px rgba(196,181,253,.35), 0 0 40px rgba(124,58,237,.25)' : 'none',
      '&:hover, &:focus-visible': { transform: 'translateY(-6px)', background: 'rgba(124, 58, 237, 0.12)' },
      '&:hover .feature-orb, &:focus-visible .feature-orb': { boxShadow: '0 0 34px rgba(167,139,250,.75)', borderColor: '#c4b5fd' },
    }}>
    <Box className="feature-orb" sx={{
      width: 72, height: 72, mx: 'auto', mb: 2, borderRadius: '50%', display: 'grid', placeItems: 'center',
      border: '1px solid rgba(196,181,253,.4)', transition: 'all .3s ease',
      background: 'radial-gradient(circle at 35% 30%, rgba(196,181,253,.35), rgba(30,15,70,.6) 70%)',
      boxShadow: active ? '0 0 30px rgba(167,139,250,.6)' : '0 0 14px rgba(167,139,250,.2)',
    }}><Icon sx={{ fontSize: 32, color: '#e9e2ff' }} /></Box>
    <Typography sx={{ fontWeight: 650, mb: 0.75 }}>{feature.title}</Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{feature.text}</Typography>
  </Box>;
}

export default function Landing({
  bank, switchUrl, error, busy, email, setEmail, password, setPassword, onSignIn,
  canEditConnection, showConnection, toggleConnection, url, setUrl, onConnect, hasEndpoint, onRegister, mode,
}) {
  const [reveal, setReveal] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  return <Box id="top" sx={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
    <AppBar position="sticky" elevation={0} sx={{
      background: 'rgba(10, 5, 24, 0.55)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(196,181,253,.1)',
    }}>
      <Container maxWidth="lg"><Toolbar disableGutters sx={{ gap: 2 }}>
        <Logo bank={bank} />
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
          {[['features', 'Features'], ['orbit', 'Access'], ['network', 'Network']].map(([id, label]) =>
            <Button key={id} color="inherit" onClick={() => scrollTo(id)} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>{label}</Button>)}
        </Stack>
        <Button variant="outlined" size="small" onClick={onRegister} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Open account</Button>
        <Button variant="contained" size="small" onClick={() => scrollTo('orbit')}>Sign in</Button>
      </Toolbar></Container>
    </AppBar>

    {/* ---------- Hero ---------- */}
    <Container maxWidth="lg" sx={{ position: 'relative', pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 } }}>
      <div className="planet peach float" style={{ width: 54, height: 54, top: 30, left: '44%' }} />
      <div className="planet ember float" style={{ width: 22, height: 22, top: 10, left: '30%', animationDelay: '-3s' }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, alignItems: 'center', gap: 6 }}>
        <Box className="rise">
          <Typography variant="overline" sx={{ color: 'primary.light' }}>Banking beyond the horizon</Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '3.6rem', sm: '4.8rem', md: '6rem' }, my: 2 }}>
            <span className="shimmer">{bank.name.split(' ')[0]}</span><br />{bank.name.split(' ').slice(1).join(' ') || 'Bank'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 18, maxWidth: 480, lineHeight: 1.7 }}>
            Your accounts, transfers and activity, all in one place. Send money across the SharedBank network and watch it arrive.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
            <Button size="large" variant="contained" startIcon={<RocketLaunchRoundedIcon />} onClick={onRegister}>Open an account</Button>
            <Button size="large" variant="outlined" onClick={() => scrollTo('orbit')}>Sign in</Button>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 4, flexWrap: 'wrap', rowGap: 1 }}>
            <Chip size="small" variant="outlined" label={'Bank ID · ' + bank.id} />
            <Chip size="small" variant="outlined" label={'IFSC · ' + bank.ifsc} />
            <Chip size="small" color="primary" variant="outlined" label={mode === 'local' ? 'Local demo mode' : 'Firestore test network'} />
          </Stack>
        </Box>

        <Box sx={{ position: 'relative', height: { xs: 320, md: 460 }, display: 'grid', placeItems: 'center' }}>
          <div className="planet violet" style={{ width: '78%', aspectRatio: '1', right: '-18%', top: '-6%', opacity: 0.95 }} />
          <Box sx={{ position: 'relative', '& svg': { width: { xs: 220, md: 300 }, height: 'auto' } }}>
            <Box className="pulse-ring" sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(196,181,253,.5)' }} />
            <Emblem size={300} />
          </Box>
        </Box>
      </Box>
    </Container>

    {/* ---------- Features ---------- */}
    <Container id="features" maxWidth="lg" sx={{ pb: { xs: 8, md: 12 }, scrollMarginTop: 80 }}>
      <Box sx={{ ...glass, p: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1 }}>
          {features.map((feature, i) => <Box key={feature.title} sx={{ gridColumn: { xs: i === 4 ? 'span 2' : 'auto', md: 'auto' } }}>
            <FeatureCard feature={feature} index={i} active={activeFeature === i} onSelect={() => setActiveFeature(i)} />
          </Box>)}
        </Box>
      </Box>
    </Container>

    {/* ---------- Sign in ---------- */}
    <Container id="orbit" maxWidth="lg" sx={{ pb: { xs: 8, md: 12 }, scrollMarginTop: 80 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 4, md: 8 }, alignItems: 'center' }}>
        <Box sx={{ position: 'relative', height: { xs: 260, md: 440 } }}>
          <div className="ringed" style={{ inset: 0 }}>
            <div className="planet violet" style={{ width: '58%', aspectRatio: '1', left: '21%', top: '50%', transform: 'translateY(-50%)' }} />
            <div className="ring" style={{ width: '108%', height: '30%' }} />
            <div className="ring thin" style={{ width: '128%', height: '40%' }} />
          </div>
        </Box>

        <Box sx={{ ...glass, p: { xs: 3, md: 5 } }} className="rise">
          <Typography variant="overline" sx={{ color: 'primary.light' }}>Customer access</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '2.4rem', md: '3rem' }, mt: 1, mb: 1 }}>Enter the Orbit</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>Customers and administrators sign in here. Applicants can follow their application status.</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Collapse in={showConnection} unmountOnExit>
            <Box component="form" onSubmit={onConnect} sx={{ display: 'grid', gap: 2, mb: 3 }}>
              <TextField label="Cloudflare Worker URL" required fullWidth value={url} onChange={e => setUrl(e.target.value)}
                helperText="Use the same Worker URL across the bank pages." />
              <Box><Button type="submit" variant="outlined">Save connection</Button></Box>
            </Box>
          </Collapse>

          {hasEndpoint && !showConnection && <Box component="form" onSubmit={onSignIn} sx={{ display: 'grid', gap: 2.2 }}>
            <TextField label="Email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
            <TextField label="Password" type={reveal ? 'text' : 'password'} autoComplete="current-password" required
              value={password} onChange={e => setPassword(e.target.value)}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">
                <Tooltip title={reveal ? 'Hide password' : 'Show password'}>
                  <IconButton edge="end" onClick={() => setReveal(v => !v)} aria-label={reveal ? 'Hide password' : 'Show password'}>
                    {reveal ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </Tooltip>
              </InputAdornment> } }} />
            <Button type="submit" variant="contained" size="large" disabled={busy} startIcon={<RocketLaunchRoundedIcon />}>
              {busy ? 'Launching…' : 'Sign in'}
            </Button>
          </Box>}

          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 3, textAlign: 'center' }}>
            New to {bank.name}? <Link component="button" type="button" onClick={onRegister} sx={{ color: 'primary.light', fontWeight: 650, verticalAlign: 'baseline' }}>Open an account</Link>
          </Typography>

          {canEditConnection && <Button size="small" startIcon={<LanRoundedIcon />} onClick={toggleConnection} sx={{ mt: 2 }}>
            {showConnection ? 'Back to sign in' : 'Worker connection'}
          </Button>}
        </Box>
      </Box>
    </Container>

    {/* ---------- Footer ---------- */}
    <Box id="network" component="footer" sx={{ borderTop: '1px solid rgba(196,181,253,.1)', py: 4, background: 'rgba(7,4,15,.55)' }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Logo bank={bank} />
          <Link href={switchUrl} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'primary.light' }}>
            <PublicRoundedIcon fontSize="small" /> SharedBank switch
          </Link>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Synthetic balances for testing only.</Typography>
        </Stack>
      </Container>
    </Box>
  </Box>;
}
