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

export const sendTwilioSMS = async (to: string[], body: string, sid: string, token: string, fromNumber: string) => {
  if (!sid || !token || !fromNumber) throw new Error('Missing Twilio Credentials. Please configure them in Settings.');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = encodeBase64(`${sid}:${token}`); // Encode credentials for Basic Auth

  // Twilio requires form-urlencoded data
  const promises = to.map(async (phone) => {
    const data = new URLSearchParams();
    data.append('To', phone);
    data.append('From', fromNumber);
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
      throw new Error(err.message || 'Failed to send SMS');
    }
  });

  await Promise.all(promises);
  return true;
};
export const makeTwilioCall = async (to: string[], twiml: string, sid: string, token: string, fromNumber: string) => {
  if (!sid || !token || !fromNumber) throw new Error('Missing Twilio Credentials.');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`;
  const auth = encodeBase64(`${sid}:${token}`);

  const promises = to.map(async (phone) => {
    const data = new URLSearchParams();
    data.append('To', phone);
    data.append('From', fromNumber);
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
      throw new Error(err.message || 'Failed to trigger call');
    }
  });

  await Promise.all(promises);
  return true;
};
