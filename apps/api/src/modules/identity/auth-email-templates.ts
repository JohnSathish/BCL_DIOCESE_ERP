/** HTML email templates for auth / security mail (table-based for client compatibility). */

const GREEN = '#1a4d3e';
const GREEN_SOFT = '#2d6a4f';
const GREEN_ACCENT = '#40916c';
const GREEN_LIGHT = '#d8f3dc';
const GREEN_BG = '#f1f8f4';
const TEXT = '#1b4332';
const MUTED = '#6c757d';
const BORDER = '#e9ecef';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function brandHeader() {
  return `
  <tr>
    <td style="background-color:${GREEN};background-image:linear-gradient(135deg, ${GREEN} 0%, ${GREEN_SOFT} 100%);padding:22px 28px;border-radius:16px 16px 0 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="left" valign="middle">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td valign="middle" style="padding-right:12px;">
                  <div style="width:42px;height:42px;border-radius:10px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);text-align:center;line-height:42px;font-size:20px;color:#fff;">✝</div>
                </td>
                <td valign="middle">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#fff;font-size:20px;font-weight:800;letter-spacing:0.5px;line-height:1.1;">BCL</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.85);font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Diocese ERP</div>
                </td>
              </tr>
            </table>
          </td>
          <td align="right" valign="middle" style="font-family:Georgia,'Times New Roman',serif;font-style:italic;color:rgba(255,255,255,0.92);font-size:14px;">
            Faith. Unity. Service.
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function brandFooter() {
  return `
  <tr>
    <td style="background-color:${GREEN};padding:20px 24px;border-radius:0 0 16px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="left" valign="middle" style="font-family:Arial,Helvetica,sans-serif;color:#fff;">
            <div style="font-size:14px;font-weight:800;">BCL</div>
            <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;opacity:0.85;">Diocese ERP</div>
          </td>
          <td align="center" valign="middle" style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.9);font-size:12px;padding:0 10px;">
            Empowering Dioceses.<br/>Strengthening Communities.
          </td>
          <td align="right" valign="middle" style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.9);font-size:11px;line-height:1.4;">
            Need help?<br/>Contact your Diocese Administrator
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function wrapEmail(innerRows: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BCL Diocese ERP</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef2f0;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(26,77,62,0.12);">
          ${brandHeader()}
          ${innerRows}
          ${brandFooter()}
        </table>
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:16px 12px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};line-height:1.5;">
              This is an automated email. Please do not reply.<br/>
              © ${new Date().getFullYear()} BaseCode Labs Pvt. Ltd. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpDigitCells(code: string) {
  const digits = code.replace(/\D/g, '').padStart(6, '0').slice(0, 6).split('');
  return digits
    .map((d, i) => {
      const cell = `<td align="center" valign="middle" width="48" height="56" style="width:48px;height:56px;background:#ffffff;border:1.5px dashed ${GREEN_ACCENT};border-radius:10px;font-family:Consolas,'Courier New',monospace;font-size:26px;font-weight:800;color:${GREEN};">${escapeHtml(d)}</td>`;
      if (i < 5) {
        return `${cell}<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>`;
      }
      return cell;
    })
    .join('');
}

export function buildLoginOtpEmail(input: {
  code: string;
  deviceName: string;
  expiresMinutes: number;
}): { subject: string; text: string; html: string } {
  const code = input.code.replace(/\D/g, '').slice(0, 6);
  const device = escapeHtml(input.deviceName || 'Unknown device');
  const minutes = input.expiresMinutes || 5;

  const subject = 'Your BCL Diocese ERP verification code';
  const text = [
    'Your BCL Diocese ERP verification code',
    '',
    `Code: ${code}`,
    `This code will expire in ${minutes} minutes.`,
    `Device: ${input.deviceName}`,
    '',
    'If you did not try to sign in, ignore this email and consider changing your password.',
  ].join('\n');

  const html = wrapEmail(`
  <tr>
    <td style="padding:36px 32px 28px;background:#ffffff;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding-bottom:18px;">
            <div style="width:56px;height:56px;border-radius:50%;background:${GREEN_LIGHT};border:2px solid ${GREEN_ACCENT};line-height:56px;text-align:center;font-size:26px;color:${GREEN_SOFT};">✓</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${GREEN_ACCENT};font-weight:600;padding-bottom:4px;">
            Your BCL Diocese ERP
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.25;font-weight:800;color:${TEXT};padding-bottom:12px;">
            verification code
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${MUTED};padding:0 12px 24px;">
            You recently requested to sign in to your BCL Diocese ERP account. Use the code below to verify your identity.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:14px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:${GREEN_BG};border-radius:14px;padding:18px 20px;">
              <tr>
                ${otpDigitCells(code)}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};padding-bottom:24px;">
            This code will expire in <strong style="color:${GREEN_ACCENT};">${minutes} minutes.</strong>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${GREEN_BG};border-radius:12px;">
              <tr>
                <td style="width:52px;padding:14px 0 14px 14px;" valign="middle">
                  <div style="width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid ${BORDER};text-align:center;line-height:36px;font-size:16px;">🖥</div>
                </td>
                <td style="padding:14px 16px 14px 8px;font-family:Arial,Helvetica,sans-serif;" valign="middle">
                  <div style="font-size:12px;font-weight:700;color:${GREEN_SOFT};padding-bottom:2px;">Device</div>
                  <div style="font-size:14px;color:${TEXT};">${device}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:28px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${GREEN_BG};border-radius:12px;">
              <tr>
                <td style="width:52px;padding:14px 0 14px 14px;" valign="middle">
                  <div style="width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid ${BORDER};text-align:center;line-height:36px;font-size:16px;">🔒</div>
                </td>
                <td style="padding:14px 16px 14px 8px;font-family:Arial,Helvetica,sans-serif;" valign="middle">
                  <div style="font-size:12px;font-weight:700;color:${GREEN_SOFT};padding-bottom:2px;">Security tip</div>
                  <div style="font-size:13px;line-height:1.45;color:${MUTED};">If you did not try to sign in, please ignore this email and consider changing your password immediately.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid ${BORDER};padding-top:22px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="33%" align="center" valign="top" style="padding:0 8px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:18px;color:${GREEN_ACCENT};padding-bottom:6px;">🛡</div>
                  <div style="font-size:13px;font-weight:700;color:${TEXT};padding-bottom:4px;">Secure</div>
                  <div style="font-size:11px;line-height:1.4;color:${MUTED};">Your account is protected with advanced security.</div>
                </td>
                <td width="33%" align="center" valign="top" style="padding:0 8px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:18px;color:${GREEN_ACCENT};padding-bottom:6px;">👥</div>
                  <div style="font-size:13px;font-weight:700;color:${TEXT};padding-bottom:4px;">Trusted</div>
                  <div style="font-size:11px;line-height:1.4;color:${MUTED};">Built for dioceses, parishes and communities.</div>
                </td>
                <td width="33%" align="center" valign="top" style="padding:0 8px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:18px;color:${GREEN_ACCENT};padding-bottom:6px;">♥</div>
                  <div style="font-size:13px;font-weight:700;color:${TEXT};padding-bottom:4px;">Unified</div>
                  <div style="font-size:11px;line-height:1.4;color:${MUTED};">One platform for faith, service and administration.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`);

  return { subject, text, html };
}

export function buildNewDeviceLoginEmail(input: {
  deviceName: string;
  browser: string;
  operatingSystem: string;
  whenLabel: string;
}): { subject: string; text: string; html: string } {
  const device = escapeHtml(input.operatingSystem || 'Unknown');
  const browser = escapeHtml(input.browser || 'Browser');
  const when = escapeHtml(input.whenLabel);
  const subject = 'New Device Login — BCL Diocese ERP';
  const text = [
    'New Device Login',
    '',
    'Your BCL Diocese ERP account was accessed from a new device.',
    `Device: ${input.operatingSystem}`,
    `Browser: ${input.browser}`,
    `Time: ${input.whenLabel}`,
    '',
    'If this was you, no action is required.',
    'If not, change your password and revoke devices under Security → Trusted Devices.',
  ].join('\n');

  const html = wrapEmail(`
  <tr>
    <td style="padding:36px 32px 28px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
      <div style="text-align:center;padding-bottom:16px;">
        <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:${GREEN_LIGHT};line-height:56px;font-size:24px;">🔔</div>
      </div>
      <h1 style="margin:0 0 10px;text-align:center;font-size:24px;color:${TEXT};">New Device Login</h1>
      <p style="margin:0 0 20px;text-align:center;font-size:14px;line-height:1.55;color:${MUTED};">
        Your BCL Diocese ERP account was accessed from a new device.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${GREEN_BG};border-radius:12px;margin-bottom:16px;">
        <tr><td style="padding:14px 16px;font-size:14px;color:${TEXT};"><strong style="color:${GREEN_SOFT};">Device:</strong> ${device}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;color:${TEXT};"><strong style="color:${GREEN_SOFT};">Browser:</strong> ${browser}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;color:${TEXT};"><strong style="color:${GREEN_SOFT};">Time:</strong> ${when}</td></tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:1.5;color:${MUTED};">
        If this was you, no action is required. If you do not recognize this activity, change your password and revoke the device from <strong>Security → Trusted Devices</strong>.
      </p>
    </td>
  </tr>`);

  return { subject, text, html };
}
