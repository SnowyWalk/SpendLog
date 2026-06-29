require('dotenv').config();

const {
  EasyCodef,
  EasyCodefConstant,
  EasyCodefUtil,
} = require('easycodef-node');

const samsungCardId = process.env.SAMSUNG_CARD_ID || '<SECRET>';
const samsungCardPassword = process.env.SAMSUNG_CARD_PASSWORD || '<SECRET>';

async function createSamsungCardAccount() {
  const {
    CODEF_DEMO_CLIENT_ID,
    CODEF_DEMO_CLIENT_SECRET,
    CODEF_CLIENT_ID,
    CODEF_CLIENT_SECRET,
    CODEF_PUBLIC_KEY,
  } = process.env;

  if (!CODEF_DEMO_CLIENT_ID || !CODEF_DEMO_CLIENT_SECRET) {
    throw new Error('CODEF_DEMO_CLIENT_ID / CODEF_DEMO_CLIENT_SECRET 값이 필요함');
  }

  if (!CODEF_PUBLIC_KEY) {
    throw new Error('CODEF_PUBLIC_KEY 값이 필요함');
  }

  if (samsungCardId === '<SECRET>' || samsungCardPassword === '<SECRET>') {
    throw new Error('SAMSUNG_CARD_ID / SAMSUNG_CARD_PASSWORD 값이 필요함');
  }

  const codef = new EasyCodef();

  codef.setPublicKey(CODEF_PUBLIC_KEY);
  codef.setClientInfoForDemo(CODEF_DEMO_CLIENT_ID, CODEF_DEMO_CLIENT_SECRET);

  if (CODEF_CLIENT_ID && CODEF_CLIENT_SECRET) {
    codef.setClientInfo(CODEF_CLIENT_ID, CODEF_CLIENT_SECRET);
  }

  const param = {
    accountList: [
      {
        countryCode: 'KR',
        businessType: 'CD',
        clientType: 'P',
        organization: '0303',
        loginType: '1',
        id: samsungCardId,
        password: EasyCodefUtil.encryptRSA(CODEF_PUBLIC_KEY, samsungCardPassword),
      },
    ],
  };

  const response = await codef.createAccount(
    EasyCodefConstant.SERVICE_TYPE_DEMO,
    param
  );

  console.log(response);
}

createSamsungCardAccount().catch(console.error);
