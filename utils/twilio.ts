const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const encodeBase64 = (input: string) => {
  let str = input; let output = '';
  for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3/4);
    if (charCode > 0xFF) throw new Error("'btoa' failed");
    block = block << 8 | charCode;
  }
  return output;
};

export const sendTwilioSMS = async (to: string | string[], body: string, sid: string, token: string, fromNumber: string) => {
  console.log(`[Twilio] Sending SMS to: ${Array.isArray(to) ? to.join(', ') : to}`);
  if (!sid || sid === 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    console.error('[Twilio] Invalid SID detected');
    throw new Error('Missing or invalid Twilio SID. Check Settings.');
  }
  if (!sid || !token || !fromNumber) throw new Error('Missing Twilio Credentials. Please configure them in Settings.');
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = encodeBase64(`${sid}:${token}`);

  const recipients = (Array.isArray(to) ? to : [to]).filter(p => !!p);
  if (recipients.length === 0) {
    console.warn('[Twilio] No valid recipients for SMS');
    return false;
  }

  const results = await Promise.allSettled(recipients.map(async (phone) => {
    const data = new URLSearchParams();
    data.append('To', phone.trim());
    data.append('From', fromNumber.trim());
    data.append('Body', body);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: data.toString()
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`[Twilio] SMS failed for ${phone}:`, err);
      throw new Error(err.message || 'Twilio API Error');
    }
    console.log(`[Twilio] SMS successfully sent to ${phone}`);
  }));

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0 && failed.length === results.length) {
    throw new Error('Failed to send SMS to any contact.');
  }
  return true;
};

export const makeTwilioCall = async (to: string | string[], twiml: string, sid: string, token: string, fromNumber: string) => {
  console.log(`[Twilio] Triggering Call to: ${Array.isArray(to) ? to.join(', ') : to}`);
  if (!sid || !token || !fromNumber) throw new Error('Missing Twilio Credentials.');
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`;
  const auth = encodeBase64(`${sid}:${token}`);

  const recipients = (Array.isArray(to) ? to : [to]).filter(p => !!p);
  if (recipients.length === 0) return false;

  const results = await Promise.allSettled(recipients.map(async (phone) => {
    const data = new URLSearchParams();
    data.append('To', phone.trim());
    data.append('From', fromNumber.trim());
    data.append('Twiml', twiml);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: data.toString()
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`[Twilio] Call failed for ${phone}:`, err);
      throw new Error(err.message || 'Twilio API Error');
    }
    console.log(`[Twilio] Call successfully triggered for ${phone}`);
  }));

  return true;
};
