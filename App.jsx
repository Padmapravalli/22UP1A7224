import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  Link as RouterLink,
  useLocation,
} from "react-router-dom";

import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
  Alert,
  Grid,
  Stack,
  Divider,
  Chip,
  Link,
  Snackbar,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Badge,
  InputAdornment,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/RemoveCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InsightsIcon from "@mui/icons-material/Insights";
import LinkIcon from "@mui/icons-material/Link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BugReportIcon from "@mui/icons-material/BugReport";

// ---------- Logging Middleware ----------
const LogContext = createContext([]);
const useLogger = () => useContext(LogContext);

const LoggerProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const log = (msg, level = "info") => {
    setLogs((prev) => [
      ...prev,
      { msg, level, ts: new Date().toLocaleTimeString() },
    ]);
  };
  return (
    <LogContext.Provider value={{ logs, log }}>{children}</LogContext.Provider>
  );
};

// ---------- Helpers ----------
const generateCode = () =>
  Math.random().toString(36).substring(2, 7) + Date.now().toString(36);

const isValidUrl = (str) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

// ---------- Shortener Page ----------
const ShortenerPage = ({ store }) => {
  const { log } = useLogger();
  const [rows, setRows] = useState([{ url: "", validity: "", code: "" }]);
  const [alert, setAlert] = useState("");

  const addRow = () => {
    if (rows.length >= 5) return;
    setRows([...rows, { url: "", validity: "", code: "" }]);
  };

  const removeRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleChange = (idx, field, val) => {
    const copy = [...rows];
    copy[idx][field] = val;
    setRows(copy);
  };

  const handleSubmit = () => {
    let ok = true;
    const results = [];

    rows.forEach((r) => {
      if (!isValidUrl(r.url)) {
        ok = false;
        setAlert("Invalid URL provided.");
        return;
      }
      let code = r.code?.trim() || generateCode();
      if (store.urls[code]) {
        ok = false;
        setAlert(Shortcode "${code}" already exists.);
        return;
      }
      let minutes = parseInt(r.validity || "30", 10);
      if (isNaN(minutes) || minutes <= 0) minutes = 30;
      const expiry = new Date(Date.now() + minutes * 60000);
      store.urls[code] = {
        original: r.url,
        expiry,
        clicks: [],
      };
      results.push({ code, expiry, url: r.url });
      log(Shortened ${r.url} -> ${code});
    });

    if (ok) {
      setRows([{ url: "", validity: "", code: "" }]);
      setAlert("URLs shortened successfully!");
    }
  };

  return (
    <Container>
      <Typography variant="h5" gutterBottom>
        URL Shortener
      </Typography>
      <Stack spacing={2}>
        {rows.map((row, idx) => (
          <Paper key={idx} sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={5}>
                <TextField
                  label="Original URL"
                  fullWidth
                  value={row.url}
                  onChange={(e) => handleChange(idx, "url", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  label="Validity (mins)"
                  fullWidth
                  value={row.validity}
                  onChange={(e) =>
                    handleChange(idx, "validity", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Custom Shortcode"
                  fullWidth
                  value={row.code}
                  onChange={(e) => handleChange(idx, "code", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <IconButton
                  color="error"
                  disabled={rows.length === 1}
                  onClick={() => removeRow(idx)}
                >
                  <RemoveIcon />
                </IconButton>
              </Grid>
            </Grid>
          </Paper>
        ))}
        <Button
          startIcon={<AddIcon />}
          disabled={rows.length >= 5}
          onClick={addRow}
        >
          Add URL
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          Shorten
        </Button>
        {alert && (
          <Alert severity="info" onClose={() => setAlert("")}>
            {alert}
          </Alert>
        )}
      </Stack>
    </Container>
  );
};

// ---------- Stats Page ----------
const StatsPage = ({ store }) => {
  const urls = store.urls;
  return (
    <Container>
      <Typography variant="h5" gutterBottom>
        URL Stats
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Short URL</TableCell>
            <TableCell>Original URL</TableCell>
            <TableCell>Expiry</TableCell>
            <TableCell>Clicks</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(urls).map(([code, data]) => (
            <TableRow key={code}>
              <TableCell>
                <Link component={RouterLink} to={/${code}}>
                  {window.location.origin}/{code}
                </Link>
              </TableCell>
              <TableCell>{data.original}</TableCell>
              <TableCell>{data.expiry.toLocaleString()}</TableCell>
              <TableCell>{data.clicks.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

// ---------- Redirect Page ----------
const RedirectPage = ({ store }) => {
  const { code } = useParams();
  const nav = useNavigate();
  const { log } = useLogger();

  useEffect(() => {
    const entry = store.urls[code];
    if (!entry) {
      alert("Shortcode not found");
      nav("/");
      return;
    }
    if (entry.expiry < new Date()) {
      alert("This link has expired.");
      nav("/");
      return;
    }
    entry.clicks.push({
      ts: new Date(),
      src: document.referrer || "direct",
    });
    log(Redirected ${code} to ${entry.original});
    window.location.href = entry.original;
  }, [code]);

  return <Typography>Redirecting...</Typography>;
};

// ---------- Log Drawer ----------
const LogDrawer = () => {
  const { logs } = useLogger();
  return (
    <Drawer anchor="right" open={true} variant="permanent">
      <List sx={{ width: 300 }}>
        <ListItem>
          <ListItemText primary="App Logs" />
        </ListItem>
        {logs.map((l, i) => (
          <ListItem key={i}>
            <ListItemText primary={${l.ts} [${l.level}] ${l.msg}} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

// ---------- Main App ----------
export default function App() {
  const store = useMemo(() => ({ urls: {} }), []);

  return (
    <LoggerProvider>
      <BrowserRouter>
        <AppBar position="static">
          <Toolbar>
            <Typography
              variant="h6"
              component={RouterLink}
              to="/"
              style={{ color: "white", textDecoration: "none" }}
            >
              Affordmed Shortener
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button component={RouterLink} to="/stats" color="inherit">
              Stats
            </Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ mt: 2 }}>
          <Routes>
            <Route path="/" element={<ShortenerPage store={store} />} />
            <Route path="/stats" element={<StatsPage store={store} />} />
            <Route path="/:code" element={<RedirectPage store={store} />} />
          </Routes>
        </Box>
        <LogDrawer />
      </BrowserRouter>
    </LoggerProvider>
  );
}
