import { FidoU2FKey, User } from '@prisma/client';

export const dbUser: User & { fidoU2fKeys: FidoU2FKey[] } = {
  id: 1,
  createdAt: new Date('2021-10-01T04:37:11.000+0100'),
  updatedAt: new Date('2021-10-01T04:37:11.000+0100'),
  uid: 'cku00k400w1rl1erlb5k37hdx',
  username: 'matthew',
  duoUserId: null,
  fidoU2fKeys: [],
  password: 'EEEgeoih8769knlkw=',
  email: 'matthew@email.com',
};

export const duoAuthorisationSignatureInput = {
  date: 'Tue, 21 Aug 2012 17:29:18 -0000',
  method: 'POST',
  path: '/accounts/v1/account/list',
  params: 'realname=First%20Last&username=root',
};

export const registerInputValid = {
  username: 'matthew1',
  email: 'matthew@email.com',
  password: 'L0ng-c0mplex-p@$$w0rd',
};

export const registerInputShortUsernameInvalidEmailLongPassword = {
  username: 'matt',
  email: 'matthew@email',
  password:
    'wlCYLjoak2ekcBItHt2nccohmLVC423gr1Ytz6zsLoCNp8dufYb9LxZnODikFNAvrt02U9l8e2At9lC32XXrq65G2z4JRNtkQTFZgZ8BXFoAOlCxNl3NMTCV92i6aueHq',
};

export const registerInputLongUsernameNoEmailShortPassword = {
  username: 'matthew-mark-luke',
  email: '',
  password: 'aA!1@',
};

export const registerInputNoUsernameNonComplexPassword = {
  username: '',
  email: 'matthew@email.com',
  password: 'lO2rNouYS5ihuwuCIy7p',
};

export const registerInputNonComplexPassword = {
  username: 'matthew1',
  email: 'matthew@email.com',
  password: 'gasgcinburxrqchgmbdwsvk',
};

export const registerInputComplexPassword = {
  username: 'matthew1',
  email: 'matthew@email.com',
  password: 'WHLNOKLIJKWMB-ZGEVLIFYE',
};

export const registerInputNoPassword = {
  username: 'matthew1',
  email: 'matthew@email.com',
  password: '',
};
