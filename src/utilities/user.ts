import type { User } from '.prisma/client';
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import hmacSHA1 from 'crypto-js/hmac-sha1';
// import { setTimeout } from 'timers/promises'; // requires node 15
import type GraphQLUser from '../entities/User';
import FieldError from '../resolvers/FieldError';
import type UsernameEmailPasswordInput from '../resolvers/UsernameEmailPasswordInput';

const DUO_ENROLL_VALID_SECS = 3600;

export async function duoPing() {
  try {
    const response: AxiosResponse<{ response: { stat: string; time: number } }> = await axios({
      url: `https://${process.env.DUO_API_HOSTNAME}/auth/v2/ping`,
      method: 'GET',
      headers: {
        Date: new Date().toUTCString(),
      },
    });
    const { status } = response;
    const { response: duoResponse } = response.data;
    const { stat, time } = duoResponse ?? {};
    if (status === 200) {
      if (stat === 'OK') {
        console.log(`${new Date(time * 1_000)}: no issues identified connecting to Duo.`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error in duoPing: ${error}`);
    return false;
  }
}

export async function duoAuth(duoUserId: string) {
  try {
    const date = new Date().toUTCString();
    const path = '/auth/v2/auth';
    const method = 'POST';
    const params = new URLSearchParams({
      user_id: duoUserId,
      factor: 'push',
      device: 'auto',
      type: 'Moment Login',
      async: '1',
    });
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: params.toString(),
    });
    const response: AxiosResponse<{
      stat: string;
      response: {
        result: string;
        status: string;
        status_msg: number;
        txid: string;
      };
    }> = await axios({
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
      let result;
      await setTimeout(() => {
        result = duoAuthStatus(txid);
      }, 10_000);
      return result;
    }

    if (status === 200 && stat === 'OK' && result === 'allow') {
      return { allow: true };
    }
    const message = `${result}, ${duoStatus}, ${statusMessage}`;
    return { allow: false, message };
  } catch (error) {
    console.error(`Error in duoAuth: ${error}`);
    return { error };
  }
}

export async function duoAuthStatus(transactionId: string) {
  try {
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
    const response: AxiosResponse<{
      stat: string;
      response: {
        result: string;
        status: string;
        status_msg: number;
        txid: string;
      };
    }> = await axios({
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
  } catch (error) {
    console.error(`Error in duoAuth: ${error}`);
    return { error };
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
  const authorisationToken = Buffer.from(`${clientId}:${hmacDigest}`, 'utf-8').toString('base64');
  return authorisationToken;
}

export async function duoCheck() {
  try {
    const date = new Date().toUTCString();
    const path = '/auth/v2/check';
    const method = 'POST';
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: '',
    });
    const response: AxiosResponse<{ stat: string; response: { time: number } }> = await axios({
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
        console.log(`${new Date(time * 1_000)}: no issues identified connecting to Duo.`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error in duoPing: ${error}`);
    return false;
  }
}

export async function duoEnroll(username: string) {
  try {
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
    const response: AxiosResponse<{
      stat: string;
      response: {
        activation_barcode: string;
        activation_code: string;
        expiration: number;
        user_id: string;
      };
    }> = await axios({
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
  } catch (error) {
    console.error(`Error in duoEnroll: ${error}`);
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
    const response: AxiosResponse<{
      stat: string;
      response: string;
    }> = await axios({
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
  } catch (error) {
    console.error(`Error in duoEnrollStatus: ${error}`);
    return { error };
  }
}

export async function duoPreauth({
  duoUserId,
  username,
}: {
  duoUserId: string | null;
  username: string;
}) {
  try {
    const date = new Date().toUTCString();
    const path = '/auth/v2/preauth';
    const method = 'POST';
    const params = new URLSearchParams(duoUserId !== null ? { user_id: duoUserId } : { username });
    const authorisationToken = duoAuthorisationToken({
      date,
      method,
      path,
      params: params.toString(),
    });
    const response: AxiosResponse<{ stat: string; response: { result: string } }> = await axios({
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
    const { result } = duoResponse ?? {};
    if (status === 200 && stat === 'OK') {
      if (result) {
        return { result };
      }
    }
    return { error: 'unexpected response in duoPreauth' };
  } catch (error) {
    console.error(`Error in duoAuth: ${error}`);
    return { error };
  }
}

export function graphqlUser(user: User): GraphQLUser {
  const { createdAt, updatedAt, uid: id, username, email, duoUserId } = user;
  return { id, createdAt, updatedAt, username, email, duoRegistered: duoUserId != null };
}

export function validateRegister(registerInput: UsernameEmailPasswordInput) {
  const result: FieldError[] = [];
  const { email, password, username } = registerInput;
  const passwordLength = password.length;
  const usernameLength = username.length;

  const emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (!emailRegex.test(email)) {
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
      !/[ !"#$%&'()*+,\-\./:;<=>?@[\\\]\^_`{|}~]+/.test(password)
    ) {
      result.push({ field: 'password', message: 'Password should be a little more complex' });
    }
  } else if (
    (!/[a-z]+/.test(password) && !/[A-Z]+/.test(password)) ||
    (!/\d+/.test(password) && !/[ !"#$%&'()*+,\-\./:;<=>?@[\\\]\^_`{|}~]+/.test(password))
  ) {
    result.push({ field: 'password', message: 'Password should be a little more complex' });
  }

  return result;
}
