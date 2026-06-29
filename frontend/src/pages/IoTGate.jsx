import { useState, useEffect, useRef } from 'react';
import { gateVerify } from '../utils/api';

const IoTGate = () => {
  const [indexNumber, setIndexNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lcdText, setLcdText] = useState({ line1: 'SYSTEM ONLINE', line2: 'WAITING FOR SCAN' });
  const [ledStatus, setLedStatus] = useState('OFF'); // OFF, GREEN, RED
  const [gateStatus, setGateStatus] = useState('LOCKED'); // LOCKED, OPENED
  const logEndRef = useRef(null);

  // Initialize hardware serial logs simulation
  useEffect(() => {
    addLog('ESP8266 boot sequence initiated...');
    addLog('Connecting to HTU-WiFi (SSID: HTU_ELECTRICAL_STAFF)...');
    setTimeout(() => {
      addLog('WiFi Connected. IP allocated: 192.168.4.120');
      addLog('Connecting to Supabase PG Direct Pool API (port: 5000)...');
      setTimeout(() => {
        addLog('Establish security handshake... OK (AES-256)');
        addLog('IoT Gate Controller ready. Ready to scan QR codes.');
      }, 1000);
    }, 1000);
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${message}`]);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!indexNumber || indexNumber.trim().length < 5) return;

    setLoading(true);
    setScanResult(null);
    setGateStatus('LOCKED');
    setLedStatus('OFF');
    setLcdText({ line1: 'CONNECTING...', line2: 'CHECKING LEDGER' });
    addLog(`Scanning index number: ${indexNumber}`);

    try {
      const response = await gateVerify(indexNumber.trim());
      const data = response.data;
      setScanResult(data);

      if (data.allowed) {
        setLedStatus('GREEN');
        setGateStatus('OPENED');
        setLcdText({ 
          line1: 'ACCESS GRANTED', 
          line2: data.student.full_name.toUpperCase().slice(0, 16) 
        });
        
        if (data.reason === 'HOD_OVERRIDE') {
          addLog(`🔓 Access GRANTED for ${data.student.full_name} via HOD Academic Override.`);
          addLog(`[Override Reason]: ${data.override_reason}`);
        } else {
          addLog(`🔓 Access GRANTED for ${data.student.full_name} (Dues Paid).`);
        }
        addLog('ESP8266: Writing HIGH to Pin D5 (Relay Active - 3000ms delay)...');

        setTimeout(() => {
          setGateStatus('LOCKED');
          setLedStatus('OFF');
          setLcdText({ line1: 'SYSTEM ONLINE', line2: 'WAITING FOR SCAN' });
          addLog('ESP8266: Writing LOW to Pin D5 (Relay De-active - Gate Locked).');
        }, 4000);
      } else {
        setLedStatus('RED');
        setGateStatus('LOCKED');
        setLcdText({ line1: 'ACCESS DENIED', line2: 'DUES OUTSTANDING' });
        addLog(`❌ Access DENIED for ${data.student.full_name || 'UNKNOWN'}. Reason: Outstanding Balance.`);
        addLog('ESP8266: Access violation. Pin D6 (Red Led Active).');
      }
    } catch (err) {
      setLedStatus('RED');
      setGateStatus('LOCKED');
      
      const errMsg = err.response?.data?.message || 'INDEX NOT RECOGNIZED';
      setLcdText({ line1: 'SCAN ERROR', line2: 'NOT FOUND' });
      addLog(`❌ Scan Error: ${errMsg}`);
    } finally {
      setLoading(false);
      setIndexNumber('');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🎓 COMPSSA — IoT Exam Hall Entry Simulator</h1>
        <span style={styles.badge}>📡 ESP8266 NodeMCU Integration</span>
      </div>

      <div style={styles.grid}>
        {/* Hardware Board View */}
        <div style={styles.boardCard}>
          <div style={styles.boardHeader}>
            <div style={styles.connectionDot} />
            <h2 style={styles.boardTitle}>Virtual IoT Controller (ESP8266 Board)</h2>
          </div>

          <div style={styles.boardBody}>
            {/* LCD Screen Display */}
            <div style={styles.lcdScreen}>
              <div style={styles.lcdBacklight}>
                <div style={styles.lcdText}>{lcdText.line1}</div>
                <div style={styles.lcdText}>{lcdText.line2}</div>
              </div>
            </div>

            {/* LED Status indicators */}
            <div style={styles.ledRow}>
              <div style={styles.ledCol}>
                <div style={{
                  ...styles.ledLight,
                  backgroundColor: ledStatus === 'GREEN' ? '#00e676' : '#1b5e20',
                  boxShadow: ledStatus === 'GREEN' ? '0 0 20px #00e676, inset 0 0 8px #fff' : 'none'
                }} />
                <span style={styles.ledLabel}>ACCESS</span>
              </div>
              <div style={styles.ledCol}>
                <div style={{
                  ...styles.ledLight,
                  backgroundColor: ledStatus === 'RED' ? '#ff1744' : '#b71c1c',
                  boxShadow: ledStatus === 'RED' ? '0 0 20px #ff1744, inset 0 0 8px #fff' : 'none'
                }} />
                <span style={styles.ledLabel}>HOLD</span>
              </div>
            </div>

            {/* Visual Gate / Relay representation */}
            <div style={styles.gateSection}>
              <p style={styles.gateLabel}>Turnstile Gate Status:</p>
              <div style={{
                ...styles.gateIndicator,
                borderColor: gateStatus === 'OPENED' ? '#00e676' : '#ff1744',
                color: gateStatus === 'OPENED' ? '#00e676' : '#ff1744',
                backgroundColor: gateStatus === 'OPENED' ? '#e6fbf1' : '#ffebee'
              }}>
                {gateStatus === 'OPENED' ? '🔓 GATE OPENED' : '🔒 GATE LOCKED'}
              </div>
            </div>
          </div>
        </div>

        {/* Control and Scan Panel */}
        <div style={styles.controlCard}>
          <h2 style={styles.controlTitle}>QR Scanner input</h2>
          <p style={styles.controlDesc}>
            Simulate a student scanning their clearance QR code at the door. Type in their index number (e.g. <code>1026002201</code> or <code>1026002202</code>) to trigger the hardware gate check.
          </p>

          <form onSubmit={handleScan} style={styles.form}>
            <input
              type="text"
              placeholder="Enter Student Index Number..."
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              disabled={loading}
              style={styles.input}
            />
            <button type="submit" disabled={loading} style={styles.scanBtn}>
              {loading ? 'Processing...' : '📷 Simulate QR Scan'}
            </button>
          </form>

          {/* Quick Preset Scan Selectors */}
          <div style={styles.presetsPanel}>
            <h3 style={styles.presetTitle}>Quick Test Presets:</h3>
            <div style={styles.presetsGrid}>
              <button 
                onClick={() => setIndexNumber('1026002201')} 
                style={styles.presetBtn}
              >
                1. Kojo Mensah (Owing - Deny)
              </button>
              <button 
                onClick={() => setIndexNumber('1026002202')} 
                style={styles.presetBtn}
              >
                2. Abena Boateng (Owing - Deny)
              </button>
              <button 
                onClick={() => setIndexNumber('1234567890')} 
                style={styles.presetBtn}
              >
                3. Maxwell Owusu (Paid - Grant)
              </button>
            </div>
            <p style={styles.note}>
              💡 *Hint: Grant an HOD Exam Override to Kojo Mensah on the HOD Portal, then scan his ID here to see the override check trigger!*
            </p>
          </div>
        </div>
      </div>

      {/* Serial Hardware Logs console */}
      <div style={styles.consoleCard}>
        <div style={styles.consoleHeader}>
          <span>📟 Serial Monitor Console (115200 Baud)</span>
          <button onClick={() => setLogs([])} style={styles.clearBtn}>Clear Log</button>
        </div>
        <div style={styles.consoleLogs}>
          {logs.map((log, idx) => (
            <div key={idx} style={styles.logLine}>{log}</div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#0f2942',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#003087',
  },
  badge: {
    backgroundColor: '#003087',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  boardCard: {
    backgroundColor: '#111827',
    borderRadius: '16px',
    border: '3px solid #1f2937',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  },
  boardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '1px solid #374151',
    paddingBottom: '12px',
  },
  connectionDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#00e676',
    boxShadow: '0 0 10px #00e676',
  },
  boardTitle: {
    margin: 0,
    fontSize: '14px',
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  boardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  lcdScreen: {
    backgroundColor: '#0f172a',
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #334155',
  },
  lcdBacklight: {
    backgroundColor: '#00e5ff20',
    border: '1px solid #00e5ff30',
    borderRadius: '4px',
    padding: '12px',
    minHeight: '60px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'monospace',
    letterSpacing: '1px',
  },
  lcdText: {
    color: '#00e5ff',
    fontSize: '16px',
    fontWeight: 'bold',
    textShadow: '0 0 4px #00e5ff',
  },
  ledRow: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '10px 0',
  },
  ledCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  ledLight: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  ledLabel: {
    color: '#9ca3af',
    fontSize: '11px',
    fontWeight: '600',
  },
  gateSection: {
    borderTop: '1px solid #374151',
    paddingTop: '16px',
  },
  gateLabel: {
    color: '#9ca3af',
    fontSize: '12px',
    margin: '0 0 8px 0',
  },
  gateIndicator: {
    textAlign: 'center',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    borderWidth: '2px',
    borderStyle: 'solid',
    transition: 'all 0.2s',
  },
  controlCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
  },
  controlTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#1a365d',
  },
  controlDesc: {
    margin: '0 0 20px 0',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  input: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1.5px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    color: '#0f2942',
  },
  scanBtn: {
    backgroundColor: '#003087',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  presetsPanel: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '20px',
  },
  presetTitle: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    color: '#475569',
    fontWeight: 'bold',
  },
  presetsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  presetBtn: {
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
  },
  note: {
    marginTop: '12px',
    fontSize: '11px',
    color: '#b45309',
    lineHeight: '1.4',
  },
  consoleCard: {
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  },
  consoleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
    paddingBottom: '10px',
    marginBottom: '12px',
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '600',
  },
  clearBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  consoleLogs: {
    maxHeight: '150px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#34d399',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '6px',
  },
  logLine: {
    lineHeight: '1.4',
  }
};

export default IoTGate;
