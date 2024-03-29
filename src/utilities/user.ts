import type { FidoU2FKey, User } from '@prisma/client';
import type { AxiosError } from 'axios';
import axios from 'axios';
import hmacSHA1 from 'crypto-js/hmac-sha1';
import { NexusGenInputs, NexusGenObjects } from '../../nexus-typegen';
// import { setTimeout } from 'timers/promises'; // requires node 15

type FieldError = NexusGenObjects['FieldError'];
type GraphQLUser = NexusGenObjects['User'];
type UsernameEmailPasswordInput = NexusGenInputs['UsernameEmailPasswordInput'];

const DUO_ENROLL_VALID_SECS = 3600;

export async function duoServerPing() {
  try {
    if (!process.env.DUO_API_HOSTNAME) {
      throw new Error('DUO_API_HOSTNAME must be defined');
    }
    const response = await axios.request<{ response: { stat: string; time: number } }>({
      url: `https://${process.env.DUO_API_HOSTNAME}/auth/v2/ping`,
      method: 'GET',
      headers: {
        Date: new Date().toUTCString(),
      },
    });
    const { status } = response;
    const { response: duoResponse }: { response: { stat: string; time: number } } = response.data;
    const { stat, time } = duoResponse ?? {};
    if (status === 200) {
      if (stat === 'OK') {
        const date = new Date(time * 1_000);
        // eslint-disable-next-line no-console
        console.log(`${date.toISOString()}: no issues identified connecting to Duo.`);
      }
      return true;
    }
    return false;
  } catch (error: unknown) {
    console.error(`Error in duoPing: ${error as string}`);
    return false;
  }
}

export function duoAuthorisationToken({
  date,
  method,
  path,
  params,
}: {
  date: string;
  method: string;
  path: string;
  params: string;
}) {
  const host = process.env.DUO_API_HOSTNAME as string;
  const clientId = process.env.DUO_CLIENT_ID as string;
  const clientSecret = process.env.DUO_CLIENT_SECRET as string;
  const signature = [date, method, host, path, params].join('\n');
  const hmacDigest = hmacSHA1(signature, clientSecret);
  const authorisationToken = Buffer.from(`${clientId}:${hmacDigest.toString()}`, 'utf-8').toString(
    'base64',
  );
  return authorisationToken;
}

export async function duoAuthStatus(transactionId: string) {
  try {
    if (!process.env.DUO_API_HOSTNAME) {
      throw new Error('DUO_API_HOSTNAME must be defined');
    }
    const date = new Date().toUTCString();
    const path = '/auth/v2/auth';
    const method = 'POST';
    const params = new URLSearchParams({
      txid: transactionId,
    });
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: params.toString(),
    });
    const response = await axios.request<{
      stat: string;
      response: {
        result: string;
        status: string;
        status_msg: number;
        txid: string;
      };
    }>({
      url: `https://${process.env.DUO_API_HOSTNAME}${path}`,
      params,
      // paramsSerializer: (params) => params.toString(),
      method,
      headers: {
        Authorization: `Basic ${authorisationToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Date: date,
      },
    });
    const { data, status } = response;
    const { stat, response: duoResponse } = data;
    const { result, status: duoStatus, status_msg: statusMessage } = duoResponse ?? {};

    if (status === 200 && stat === 'OK' && result === 'allow') {
      return { allow: true };
    }
    const message = `${result}, ${duoStatus}, ${statusMessage}`;
    return { allow: false, message };
  } catch (error: unknown) {
    console.error(`Error in duoAuth: ${error as string}`);
    return { error };
  }
}

export async function duoAuth({ device, duoUserId }: { device: string; duoUserId: string }) {
  try {
    if (!process.env.DUO_API_HOSTNAME) {
      throw new Error('DUO_API_HOSTNAME must be defined');
    }
    const date = new Date().toUTCString();
    const path = '/auth/v2/auth';
    const method = 'POST';
    const params = new URLSearchParams({
      user_id: duoUserId,
      factor: 'push',
      device,
      // type: 'Moment Login',
      async: '1',
    });
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: params.toString(),
    });
    const response = await axios.request<{
      stat: string;
      response: {
        result: string;
        status: string;
        status_msg: number;
        txid: string;
      };
    }>({
      url: `https://${process.env.DUO_API_HOSTNAME}${path}`,
      params,
      // paramsSerializer: (params) => params.toString(),
      method,
      headers: {
        Authorization: `Basic ${authorisationToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Date: date,
      },
    });
    const { data, status } = response;
    const { stat, response: duoResponse } = data;
    const { result, status: duoStatus, status_msg: statusMessage, txid } = duoResponse ?? {};

    if (txid) {
      let txidResult;
      setTimeout(() => {
        txidResult = duoAuthStatus(txid);
      }, 10_000);
      if (txidResult) {
        return txidResult;
      }
    }

    if (status === 200 && stat === 'OK' && result === 'allow') {
      return { allow: true };
    }
    const message = `${result}, ${duoStatus}, ${statusMessage}`;
    return { allow: false, message };
  } catch (error: unknown) {
    let message;
    const err = error as Error | AxiosError;
    if (axios.isAxiosError(err)) {
      if (err.response) {
        message = `Error in duoAuth server responded with non 2xx code: ${JSON.stringify(
          err.response.data,
        )}`;
      } else if (err.request) {
        message = `Error in duoAuth no response received: ${err.request as string}`;
      } else {
        message = `Error in duoAuth error setting up storage response: ${err.message}`;
      }
    } else {
      message = error as string;
    }

    console.error(message);
    return { error: message };
  }
}

export async function duoCheck() {
  try {
    if (!process.env.DUO_API_HOSTNAME) {
      throw new Error('DUO_API_HOSTNAME must be defined');
    }
    const date = new Date().toUTCString();
    const path = '/auth/v2/check';
    const method = 'POST';
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: '',
    });
    const response = await axios.request<{ stat: string; response: { time: number } }>({
      url: `https://${process.env.DUO_API_HOSTNAME}${path}`,
      method,
      headers: {
        Authorization: `Basic ${authorisationToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Date: date,
      },
    });
    const { status } = response;
    const { stat, response: duoResponse } = response.data;
    const { time } = duoResponse ?? {};
    if (status === 200) {
      if (stat === 'OK') {
        const responseDate = new Date(time * 1_000);
        // eslint-disable-next-line no-console
        console.log(`${responseDate.toISOString()}: no issues identified connecting to Duo.`);
      }
      return true;
    }
    return false;
  } catch (error: unknown) {
    console.error(`Error in duoPing: ${error as string}`);
    return false;
  }
}

export async function duoEnroll(username: string) {
  try {
    if (!process.env.DUO_API_HOSTNAME) {
      throw new Error('DUO_API_HOSTNAME must be defined');
    }
    const date = new Date().toUTCString();
    const path = '/auth/v2/enroll';
    const method = 'POST';
    const params = new URLSearchParams({ username, valid_secs: DUO_ENROLL_VALID_SECS.toString() });
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: params.toString(),
    });
    const response = await axios.request<{
      stat: string;
      response: {
        activation_barcode: string;
        activation_code: string;
        expiration: number;
        user_id: string;
      };
    }>({
      url: `https://${process.env.DUO_API_HOSTNAME}${path}`,
      params,
      // paramsSerializer: (params) => params.toString(),
      method,
      headers: {
        Authorization: `Basic ${authorisationToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Date: date,
      },
    });
    const { data, status } = response;
    const { stat, response: duoResponse } = data;
    const {
      activation_barcode: qrCode,
      activation_code: activationCode,
      user_id: duoUserId,
    } = duoResponse ?? {};

    if (status === 200 && stat === 'OK') {
      return { qrCode, activationCode, duoUserId };
    }
    return { error: stat };
  } catch (error: unknown) {
    console.error(`Error in duoEnroll: ${error as string}`);
    return { error };
  }
}

export async function duoEnrollStatus({
  duoUserId,
  activationCode,
}: {
  duoUserId: string;
  activationCode: string;
}) {
  try {
    if (!process.env.DUO_API_HOSTNAME) {
      throw new Error('DUO_API_HOSTNAME must be defined');
    }
    const date = new Date().toUTCString();
    const path = '/auth/v2/enroll_status';
    const method = 'POST';
    const params = new URLSearchParams({ user_id: duoUserId, activation_code: activationCode });
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: params.toString(),
    });
    const response = await axios.request<{
      stat: string;
      response: string;
    }>({
      url: `https://${process.env.DUO_API_HOSTNAME}${path}`,
      params,
      // paramsSerializer: (params) => params.toString(),
      method,
      headers: {
        Authorization: `Basic ${authorisationToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Date: date,
      },
    });
    const { data, status } = response;
    const { stat, response: duoResponse } = data;

    if (status === 200 && stat === 'OK' && duoResponse) {
      return { result: duoResponse };
    }
    return { error: stat };
  } catch (error: unknown) {
    console.error(`Error in duoEnrollStatus: ${error as string}`);
    return { error };
  }
}

export async function duoPreauth({
  duoUserId,
  username,
}: {
  duoUserId: string | null;
  username?: string;
}) {
  try {
    if (!process.env.DUO_API_HOSTNAME) {
      throw new Error('DUO_API_HOSTNAME must be defined');
    }
    const date = new Date().toUTCString();
    const path = '/auth/v2/preauth';
    const method = 'POST';
    if (duoUserId == null && typeof username === 'undefined') {
      return { error: 'Server error: either duoUserId or username required' };
    }
    // condition above should prevent case where we send empty username in request
    const params = new URLSearchParams(
      duoUserId != null ? { user_id: duoUserId } : { username: username ?? '' },
    );
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: params.toString(),
    });
    const response = await axios.request<{
      stat: string;
      response: {
        result: string;
        devices: [
          {
            capabilities: string[];
            device: string;
            display_name: string;
            name: string;
            number: number;
            type: string;
          },
        ];
      };
    }>({
      url: `https://${process.env.DUO_API_HOSTNAME}${path}`,
      params,
      // paramsSerializer: (params) => params.toString(),
      method,
      headers: {
        Authorization: `Basic ${authorisationToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Date: date,
      },
    });
    const { data, status } = response;
    const { stat, response: duoResponse } = data;
    const { devices, result } = duoResponse ?? {};
    if (status === 200 && stat === 'OK') {
      if (result) {
        return { result, devices };
      }
    }
    return { error: 'unexpected response in duoPreauth' };
  } catch (error: unknown) {
    console.error(`Error in duoAuth: ${error as string}`);
    return { error };
  }
}

export function graphqlUser(user: User & { fidoU2fKeys: FidoU2FKey[] }): GraphQLUser {
  const { createdAt, updatedAt, uid: id, username, email, duoUserId, fidoU2fKeys } = user;
  return {
    id,
    createdAt,
    updatedAt,
    username,
    email,
    duoRegistered: duoUserId != null,
    fidoU2fRegistered: fidoU2fKeys.length > 0,
  };
}

export function validateRegister(registerInput: UsernameEmailPasswordInput) {
  const result: FieldError[] = [];
  const { email, password, username } = registerInput;
  const passwordLength = password.trim().length;
  const usernameLength = username.trim().length;

  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (!emailRegex.test(email.trim())) {
    result.push({ field: 'email', message: 'Check the email address' });
  }

  if (usernameLength < 8) {
    result.push({ field: 'username', message: 'Username should be a little longer' });
  }
  if (usernameLength > 16) {
    result.push({ field: 'username', message: 'Username should be a little shorter' });
  }
  if (!/^[A-Z,a-z,0-9,\-,_]+$/.test(username)) {
    result.push({
      field: 'username',
      message: 'Could you choose a username with only letters, numbers, underscores and hyphens?',
    });
  }
  if (passwordLength < 20) {
    result.push({ field: 'password', message: 'Password should be a little longer' });
  }
  if (passwordLength > 128) {
    result.push({ field: 'password', message: 'Password should be a little shorter' });
  }
  if (passwordLength < 23) {
    if (
      !/[a-z]+/.test(password) ||
      !/[A-Z]+/.test(password) ||
      !/\d+/.test(password) ||
      !/[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+/.test(password)
    ) {
      result.push({ field: 'password', message: 'Password should be a little more complex' });
    }
  } else if (
    (!/[a-z]+/.test(password) && !/[A-Z]+/.test(password)) ||
    (!/\d+/.test(password) && !/[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+/.test(password))
  ) {
    result.push({ field: 'password', message: 'Password should be a little more complex' });
  }

  return result;
}
