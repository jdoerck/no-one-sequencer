// Entry point: wire up every panel, then start the monitor loop.
import './lib/claude-shim.js';
import './styles.css';
import {initTransport} from './transport.js';
import {buildGuard, syncGuard} from './ui/guard.js';
import {buildRows, initTempo} from './ui/rows.js';
import {buildVoices, buildOut} from './ui/voices.js';
import {buildPresets, markPreset} from './ui/presets.js';
import {startMonitor} from './ui/monitor.js';
import {initExport} from './export/take.js';

initTransport();
buildGuard();
buildPresets();
initTempo();
buildRows();
buildVoices();
buildOut();
syncGuard();
markPreset();
initExport();
startMonitor();
