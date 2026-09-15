import express from 'express';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';
  const syncFile = path.resolve(process.cwd(), '.sync_data.json');

  // Security Hardening: Disable information disclosure
  app.disable('x-powered-by');

  // Security Hardening: Global Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '50mb' }));

  // Helper function to sanitize keys and prevent prototype pollution
  function isSafeKey(key: string): boolean {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype' && /^[a-zA-Z0-9_-]+$/.test(key);
  }

  // API health & Hostinger deployment check
  app.get(['/api/health', '/health'], (req, res) => {
    res.json({ 
      status: 'ok', 
      nodeVersion: process.version, 
      port: PORT,
      timestamp: new Date().toISOString() 
    });
  });

  // Helper to extract timestamp for conflict resolution
  function getRecordTimestamp(record: any): number {
    if (!record || typeof record !== 'object') return 0;
    const candidates = [record.updatedAt, record.timestamp, record.createdAt, record.date, record.orderDate];
    for (const val of candidates) {
      if (val) {
        const t = new Date(val).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
    }
    return 0;
  }

  // Conflict resolution: prioritize incoming entry if its timestamp is >= existing timestamp
  function resolveRecordConflict(existing: any, incoming: any): { winner: any; replaced: boolean } {
    if (!existing) return { winner: incoming, replaced: false };
    if (!incoming) return { winner: existing, replaced: false };
    const existingTime = getRecordTimestamp(existing);
    const incomingTime = getRecordTimestamp(incoming);

    // Prioritize incoming/newer local entry
    if (incomingTime >= existingTime) {
      return { winner: incoming, replaced: existingTime > 0 };
    }
    return { winner: existing, replaced: false };
  }

  // Multi-Browser & Multi-Device Sync endpoints
  app.get('/api/sync', (req, res) => {
    let data = {};
    try {
      if (fs.existsSync(syncFile)) {
        data = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
      }
    } catch (e) {}
    res.json({ success: true, data });
  });

  app.post('/api/sync', (req, res) => {
    try {
      const incomingData = req.body.data || req.body;
      let existing: Record<string, any[]> = {};
      try {
        if (fs.existsSync(syncFile)) {
          existing = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
        }
      } catch (e) {}

      const conflictStats = {
        totalIncoming: 0,
        accepted: 0,
        preserved: 0,
        conflicts: 0
      };

      for (const [key, items] of Object.entries(incomingData)) {
        if (!isSafeKey(key)) continue;
        if (Array.isArray(items)) {
          if (!existing[key]) {
            existing[key] = [];
          }

          const existingMap = new Map<string, any>();
          for (const it of existing[key]) {
            if (it && it.id) existingMap.set(it.id, it);
          }

          for (const inc of items) {
            if (!inc || !inc.id) continue;
            conflictStats.totalIncoming++;

            if (existingMap.has(inc.id)) {
              conflictStats.conflicts++;
              const ex = existingMap.get(inc.id);
              const { winner, replaced } = resolveRecordConflict(ex, inc);
              existingMap.set(inc.id, winner);
              if (replaced || winner === inc) {
                conflictStats.accepted++;
              } else {
                conflictStats.preserved++;
              }
            } else {
              existingMap.set(inc.id, inc);
              conflictStats.accepted++;
            }
          }

          // Sort records so newest entries are prepended first
          const mergedList = Array.from(existingMap.values()).sort((a, b) => {
            const timeA = getRecordTimestamp(a);
            const timeB = getRecordTimestamp(b);
            if (timeA !== timeB) return timeB - timeA;
            return 0;
          });

          existing[key] = mergedList;
        }
      }

      fs.writeFileSync(syncFile, JSON.stringify(existing, null, 2), 'utf-8');
      res.json({
        success: true,
        message: 'Synchronized with cloud server successfully with conflict resolution',
        conflictStats,
        data: existing,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Sync error' });
    }
  });

  // Single entity real-time update with conflict resolution
  app.post('/api/sync/record', (req, res) => {
    try {
      const { entityType, record } = req.body;
      if (!entityType || !isSafeKey(entityType) || !record || !record.id) {
        return res.status(400).json({ success: false, message: 'Valid entityType and record with id required' });
      }

      let existing: Record<string, any[]> = {};
      try {
        if (fs.existsSync(syncFile)) {
          existing = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
        }
      } catch (e) {}

      if (!existing[entityType]) {
        existing[entityType] = [];
      }

      const existingIndex = existing[entityType].findIndex(item => item.id === record.id);
      let resolutionResult = 'added';

      if (existingIndex >= 0) {
        const ex = existing[entityType][existingIndex];
        const { winner, replaced } = resolveRecordConflict(ex, record);
        existing[entityType][existingIndex] = winner;
        resolutionResult = replaced || winner === record ? 'updated_newer_local' : 'preserved_newer_remote';
      } else {
        existing[entityType].unshift(record);
      }

      // Re-sort descending
      existing[entityType].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

      fs.writeFileSync(syncFile, JSON.stringify(existing, null, 2), 'utf-8');
      res.json({
        success: true,
        resolutionResult,
        record,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Record sync error' });
    }
  });

  // ==========================================
  // MASTER SERVER CONTROL & LICENSE API GATEWAY
  // ==========================================
  const masterUsersFile = path.resolve(process.cwd(), '.master_users.json');
  const masterLicensesFile = path.resolve(process.cwd(), '.master_licenses.json');
  const masterHeartbeatsFile = path.resolve(process.cwd(), '.master_heartbeats.json');
  const masterAuditLogsFile = path.resolve(process.cwd(), '.master_audit_logs.json');
  const masterBackupsDir = path.resolve(process.cwd(), '.master_client_backups');

  if (!fs.existsSync(masterBackupsDir)) {
    try {
      fs.mkdirSync(masterBackupsDir, { recursive: true });
    } catch (e) {}
  }

  // Helper function to read/write JSON files safely
  function readJsonFile<T>(filePath: string, fallback: T): T {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (e) {}
    return fallback;
  }

  function writeJsonFile(filePath: string, data: any): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {}
  }

  // Log audit action on the server
  function logServerAudit(action: string, category: string, details: string, targetClient?: string) {
    try {
      const logs = readJsonFile<any[]>(masterAuditLogsFile, []);
      logs.unshift({
        id: 'srv_audit_' + Date.now(),
        timestamp: new Date().toISOString(),
        action,
        category,
        details,
        targetClient
      });
      writeJsonFile(masterAuditLogsFile, logs.slice(0, 500));
    } catch (e) {}
  }

  // --- 1. MASTER USERS API ---
  app.get('/api/master/users', (req, res) => {
    try {
      const users = readJsonFile<any[]>(masterUsersFile, []);
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/master/users', (req, res) => {
    try {
      const user = req.body;
      if (!user || !user.id) {
        return res.status(400).json({ success: false, message: 'User ID required' });
      }
      const users = readJsonFile<any[]>(masterUsersFile, []);
      const idx = users.findIndex(u => u.id === user.id);
      user.updatedAt = new Date().toISOString();
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...user };
      } else {
        users.unshift(user);
      }
      writeJsonFile(masterUsersFile, users);
      logServerAudit('User Saved', 'SECURITY', `Updated/Created user ${user.name} (${user.role})`, user.storeName);
      res.json({ success: true, user, users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/master/users/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const users = readJsonFile<any[]>(masterUsersFile, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx >= 0) {
        users[idx].status = status;
        users[idx].isOnline = status === 'Active';
        users[idx].updatedAt = new Date().toISOString();
        writeJsonFile(masterUsersFile, users);
        logServerAudit('User Status Changed', 'SECURITY', `User ${users[idx].name} status changed to ${status}`, users[idx].storeName);
        return res.json({ success: true, user: users[idx], users });
      }
      res.status(404).json({ success: false, message: 'User not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/master/users/:id/modules', (req, res) => {
    try {
      const { id } = req.params;
      const { allowedModules } = req.body;
      const users = readJsonFile<any[]>(masterUsersFile, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx >= 0) {
        users[idx].allowedModules = { ...(users[idx].allowedModules || {}), ...allowedModules };
        users[idx].updatedAt = new Date().toISOString();
        writeJsonFile(masterUsersFile, users);
        logServerAudit('User Modules Updated', 'SECURITY', `Updated allowed modules for ${users[idx].name}`, users[idx].storeName);
        return res.json({ success: true, user: users[idx] });
      }
      res.status(404).json({ success: false, message: 'User not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/master/users/:id/permissions', (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      const users = readJsonFile<any[]>(masterUsersFile, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx >= 0) {
        users[idx].permissions = { ...(users[idx].permissions || {}), ...permissions };
        users[idx].updatedAt = new Date().toISOString();
        writeJsonFile(masterUsersFile, users);
        logServerAudit('User Permissions Updated', 'SECURITY', `Updated permissions matrix for ${users[idx].name}`, users[idx].storeName);
        return res.json({ success: true, user: users[idx] });
      }
      res.status(404).json({ success: false, message: 'User not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/master/users/:id/settings', (req, res) => {
    try {
      const { id } = req.params;
      const { settings } = req.body;
      const users = readJsonFile<any[]>(masterUsersFile, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx >= 0) {
        users[idx].customSettingsOverrides = { ...(users[idx].customSettingsOverrides || {}), ...settings };
        users[idx].updatedAt = new Date().toISOString();
        writeJsonFile(masterUsersFile, users);
        logServerAudit('User Settings Overridden', 'SECURITY', `Custom settings updated for ${users[idx].name}`, users[idx].storeName);
        return res.json({ success: true, user: users[idx] });
      }
      res.status(404).json({ success: false, message: 'User not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/master/users/:id/passcode', (req, res) => {
    try {
      const { id } = req.params;
      const { passcode } = req.body;
      const users = readJsonFile<any[]>(masterUsersFile, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx >= 0) {
        users[idx].passcode = passcode;
        users[idx].updatedAt = new Date().toISOString();
        writeJsonFile(masterUsersFile, users);
        logServerAudit('Passcode Reset', 'SECURITY', `Reset passcode for user ${users[idx].name}`, users[idx].storeName);
        return res.json({ success: true, message: 'Passcode updated successfully' });
      }
      res.status(404).json({ success: false, message: 'User not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.delete('/api/master/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      let users = readJsonFile<any[]>(masterUsersFile, []);
      const target = users.find(u => u.id === id);
      users = users.filter(u => u.id !== id);
      writeJsonFile(masterUsersFile, users);
      if (target) {
        logServerAudit('User Deleted', 'SECURITY', `Deleted user account ${target.name}`, target.storeName);
      }
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/master/users/:id/disconnect', (req, res) => {
    try {
      const { id } = req.params;
      const users = readJsonFile<any[]>(masterUsersFile, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx >= 0) {
        users[idx].status = 'Disconnected';
        users[idx].isOnline = false;
        users[idx].updatedAt = new Date().toISOString();
        writeJsonFile(masterUsersFile, users);
        logServerAudit('User Disconnected', 'SECURITY', `Force disconnected terminal for ${users[idx].name}`, users[idx].storeName);
        return res.json({ success: true, message: `User ${users[idx].name} disconnected`, users });
      }
      res.status(404).json({ success: false, message: 'User not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // --- 2. MASTER LICENSES API ---
  app.get('/api/master/licenses', (req, res) => {
    try {
      const licenses = readJsonFile<any[]>(masterLicensesFile, []);
      res.json({ success: true, licenses });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/master/licenses', (req, res) => {
    try {
      const license = req.body;
      if (!license || !license.licenseKey) {
        return res.status(400).json({ success: false, message: 'License key required' });
      }
      const licenses = readJsonFile<any[]>(masterLicensesFile, []);
      const idx = licenses.findIndex(l => l.id === license.id || l.licenseKey === license.licenseKey);
      license.updatedAt = new Date().toISOString();
      if (idx >= 0) {
        licenses[idx] = { ...licenses[idx], ...license };
      } else {
        licenses.unshift(license);
      }
      writeJsonFile(masterLicensesFile, licenses);
      logServerAudit('License Saved', 'LICENSE', `Saved license ${license.licenseKey} for ${license.clientName}`, license.clientName);
      res.json({ success: true, license, licenses });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.delete('/api/master/licenses/:id', (req, res) => {
    try {
      const { id } = req.params;
      let licenses = readJsonFile<any[]>(masterLicensesFile, []);
      const target = licenses.find(l => l.id === id);
      licenses = licenses.filter(l => l.id !== id);
      writeJsonFile(masterLicensesFile, licenses);
      if (target) {
        logServerAudit('License Deleted', 'LICENSE', `Deleted license ${target.licenseKey} (${target.clientName})`, target.clientName);
      }
      res.json({ success: true, licenses });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // --- 3. MASTER AUDIT LOGS API ---
  app.get('/api/master/audit-logs', (req, res) => {
    try {
      const logs = readJsonFile<any[]>(masterAuditLogsFile, []);
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/master/audit-logs', (req, res) => {
    try {
      const { action, category, details, targetClient } = req.body;
      logServerAudit(action, category, details, targetClient);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 1. License Check / Verify Endpoint (For client software instances)
  app.get('/api/master/license/verify', (req, res) => {
    try {
      const { key, installationId, clientName } = req.query as { key?: string; installationId?: string; clientName?: string };
      
      let licenses: any[] = [];
      if (fs.existsSync(masterLicensesFile)) {
        try {
          licenses = JSON.parse(fs.readFileSync(masterLicensesFile, 'utf-8'));
        } catch (e) {}
      }

      if (!key) {
        return res.status(400).json({ valid: false, message: 'License key is required' });
      }

      const match = licenses.find((l: any) => l.licenseKey === key || l.key === key);
      
      if (!match) {
        // Fallback for default seed license if not yet customized
        if (key === 'MBI-PRO-2026-8812' || key.startsWith('MBI-')) {
          return res.json({
            valid: true,
            status: 'Active',
            plan: 'Enterprise Business Local Plan',
            expiryDate: '2029-12-31',
            allowedModules: { sales: true, purchases: true, pharmacy: true, inventory: true, reports: true, cloudSync: true },
            message: 'License verified successfully with Master Server'
          });
        }
        return res.json({ valid: false, status: 'Invalid', message: 'License key not recognized by Master Control Server' });
      }

      const now = new Date().toISOString().slice(0, 10);
      let isExpired = false;
      if (match.expiryDate && match.expiryDate !== 'Lifetime' && match.expiryDate < now) {
        isExpired = true;
      }

      const effectiveStatus = isExpired ? 'Expired' : match.status || 'Active';

      res.json({
        valid: effectiveStatus === 'Active',
        status: effectiveStatus,
        plan: match.plan || 'Standard POS',
        clientName: match.clientName || clientName || 'Licensed Business',
        expiryDate: match.expiryDate || 'Lifetime',
        allowedModules: match.allowedModules || {},
        maxDevices: match.maxDevices || 1,
        message: effectiveStatus === 'Active' ? 'License is Active & Verified' : `License status is ${effectiveStatus}`
      });
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err?.message || 'License check failed' });
    }
  });

  // 2. Client Heartbeat Endpoint (Clients report metrics & receive remote kill-switch / messages)
  app.post('/api/master/heartbeat', (req, res) => {
    try {
      const { installationId, clientName, licenseKey, appVersion, dataMetrics, ip } = req.body;
      if (!installationId) {
        return res.status(400).json({ success: false, message: 'installationId required' });
      }

      let heartbeats: Record<string, any> = {};
      if (fs.existsSync(masterHeartbeatsFile)) {
        try {
          heartbeats = JSON.parse(fs.readFileSync(masterHeartbeatsFile, 'utf-8'));
        } catch (e) {}
      }

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ip || '127.0.0.1';
      const existing = heartbeats[installationId] || {};

      heartbeats[installationId] = {
        ...existing,
        installationId,
        clientName: clientName || existing.clientName || 'Unknown Client',
        licenseKey: licenseKey || existing.licenseKey || 'N/A',
        appVersion: appVersion || '1.0.0',
        lastHeartbeat: new Date().toISOString(),
        ipAddress: String(clientIp),
        dataMetrics: dataMetrics || existing.dataMetrics || {},
      };

      fs.writeFileSync(masterHeartbeatsFile, JSON.stringify(heartbeats, null, 2), 'utf-8');

      res.json({
        success: true,
        serverTime: new Date().toISOString(),
        remoteCommand: existing.remoteCommand || null,
        remoteMessage: existing.remoteMessage || null,
        status: existing.status || 'Active'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Heartbeat error' });
    }
  });

  // 3. Client Remote Backup Push Endpoint (Stores partitioned backup under Client Name)
  app.post('/api/master/backup/push', (req, res) => {
    try {
      const { clientName, installationId, recordCounts, backupPayload, notes } = req.body;
      const safeName = (clientName || 'General_Client').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup_${safeName}_${timestamp}.json`;
      const filePath = path.join(masterBackupsDir, fileName);

      const backupObj = {
        id: `bk_${Date.now()}`,
        clientName: clientName || 'Client Business',
        installationId: installationId || 'N/A',
        timestamp: new Date().toISOString(),
        fileName,
        sizeKb: Math.round(Buffer.byteLength(JSON.stringify(backupPayload || {})) / 1024),
        recordCounts: recordCounts || {},
        notes: notes || 'Automated client push backup',
        backupPayload: backupPayload || {}
      };

      fs.writeFileSync(filePath, JSON.stringify(backupObj, null, 2), 'utf-8');

      res.json({
        success: true,
        message: `Backup for "${clientName}" saved successfully on Master Server`,
        fileName,
        sizeKb: backupObj.sizeKb,
        timestamp: backupObj.timestamp
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Remote backup push failed' });
    }
  });

  // 4. Master Server Backups List Endpoint
  app.get('/api/master/backups', (req, res) => {
    try {
      const { client } = req.query;
      let files = fs.readdirSync(masterBackupsDir);
      if (client) {
        const safe = String(client).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        files = files.filter(f => f.toLowerCase().includes(safe));
      }

      const backups = files.map(file => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(masterBackupsDir, file), 'utf-8'));
          return {
            id: content.id || file,
            clientName: content.clientName || 'Unknown',
            installationId: content.installationId,
            timestamp: content.timestamp,
            fileName: content.fileName || file,
            sizeKb: content.sizeKb || 0,
            recordCounts: content.recordCounts || {},
            notes: content.notes
          };
        } catch (e) {
          return { id: file, fileName: file, clientName: 'Unknown', timestamp: new Date().toISOString(), sizeKb: 0 };
        }
      });

      res.json({ success: true, backups: backups.reverse() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to list backups' });
    }
  });

  // Vite middleware for development (dynamic import to prevent loading Vite in production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.resolve(__dirname, '..', 'dist');

    // Serve static assets with caching
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: true
    }));

    // Fallback for nested asset requests (e.g. /sale/invoices/assets/app.js)
    app.use('*/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      fallthrough: true
    }));

    // Serve public root files (favicon, manifest, icons, service worker)
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html') || filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));

    // SPA client-side fallback
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT} (Node: ${process.version})`);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

startServer();
