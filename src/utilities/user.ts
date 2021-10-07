import { FidoU2FKey } from '.pnpm/@prisma+client@3.1.1_prisma@3.1.1/node_modules/.prisma/client';
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

export async function duoAuth({ device, duoUserId }: { device: string; duoUserId: string }) {
  try {
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
      if (result) {
        return result;
      }
    }

    if (status === 200 && stat === 'OK' && result === 'allow') {
      return { allow: true };
    }
    const message = `${result}, ${duoStatus}, ${statusMessage}`;
    return { allow: false, message };
  } catch (error) {
    let message;
    if (error.response) {
      message = `Error in duoAuth server responded with non 2xx code: ${{
        ...error.response.data,
      }}`;
    } else if (error.request) {
      message = `Error in duoAuth no response received: ${error.request}`;
    } else {
      message = `Error in duoAuth error setting up storage response: ${error.message}`;
    }
    console.error(message);
    return { error: message };
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
  username?: string;
}) {
  try {
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
    const response: AxiosResponse<{
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
    const { devices, result } = duoResponse ?? {};
    if (status === 200 && stat === 'OK') {
      if (result) {
        return { result, devices };
      }
    }
    return { error: 'unexpected response in duoPreauth' };
  } catch (error) {
    console.error(`Error in duoAuth: ${error}`);
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
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

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
