export const dbUser = {
  id: 1,
  createdAt: new Date('2021-10-01T04:37:11.000+0100'),
  updatedAt: new Date('2021-10-01T04:37:11.000+0100'),
  uid: 'cku00k400w1rl1erlb5k37hdx',
  username: 'matthew',
  password: 'EEEgeoih8769knlkw=',
  email: 'matthew@gmail.com',
};

export const registerInputValid = {
  username: 'matthew1',
  email: 'matthew@gmail.com',
  password: 'L0ng-c0mplex-p@$$w0rd',
};

export const registerInputShortUsernameInvalidEmailLongPassword = {
  username: 'matt',
  email: 'matthew@gmail',
  password:
    'wlCYLjoak2ekcBItHt2nccohmLVC423gr1Ytz6zsLoCNp8dufYb9LxZnODikFNAvrt02U9l8e2At9lC32XXrq65G2z4JRNtkQTFZgZ8BXFoAOlCxNl3NMTCV92i6aueHq',
};

export const registerInputLongUsernameNoEmailShortPassword = {
  username: 'matthew-mark-like',
  email: '',
  password: 'aA!1@',
};
