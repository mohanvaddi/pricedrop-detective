import axios, { AxiosInstance } from 'axios';
import config from '../../config';

interface RedditMessage {
  id: string;
  name: string;       // fullname, e.g. "t4_abc123"
  author: string;     // Reddit username
  subject: string;
  body: string;
}

interface RedditListingResponse {
  data: { children: { data: RedditMessage }[] };
}

let _client: AxiosInstance | null = null;
let _tokenExpiry = 0;
let _token = '';

async function getAccessToken(): Promise<string> {
  if (Date.now() < _tokenExpiry && _token) return _token;

  const res = await axios.post<{ access_token: string; expires_in: number }>(
    'https://www.reddit.com/api/v1/access_token',
    'grant_type=password' +
      `&username=${encodeURIComponent(config.REDDIT_USERNAME)}` +
      `&password=${encodeURIComponent(config.REDDIT_PASSWORD)}`,
    {
      auth: { username: config.REDDIT_CLIENT_ID, password: config.REDDIT_CLIENT_SECRET },
      headers: { 'User-Agent': config.REDDIT_USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );

  _token = res.data.access_token;
  _tokenExpiry = Date.now() + res.data.expires_in * 1000 - 60_000; // refresh 1 min early
  return _token;
}

async function client(): Promise<AxiosInstance> {
  const token = await getAccessToken();
  if (!_client) {
    _client = axios.create({
      baseURL: 'https://oauth.reddit.com',
      headers: { 'User-Agent': config.REDDIT_USER_AGENT },
    });
    _client.interceptors.request.use((cfg) => {
      cfg.headers['Authorization'] = `bearer ${token}`;
      return cfg;
    });
  }
  return _client;
}

export async function getUnreadMessages(): Promise<RedditMessage[]> {
  const api = await client();
  const res = await api.get<RedditListingResponse>('/message/unread?limit=25');
  return res.data.data.children.map((c) => c.data);
}

export async function sendDM(username: string, subject: string, body: string): Promise<void> {
  const api = await client();
  await api.post('/api/compose', null, {
    params: { to: username, subject, text: body },
  });
}

export async function markRead(messageFullnames: string[]): Promise<void> {
  if (messageFullnames.length === 0) return;
  const api = await client();
  await api.post('/api/read_message', null, {
    params: { id: messageFullnames.join(',') },
  });
}
