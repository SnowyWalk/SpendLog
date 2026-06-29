require('dotenv').config({ quiet: true });

const {
  EasyCodef,
  EasyCodefConstant,
  EasyCodefUtil,
} = require('easycodef-node');

const bcCardId = process.env.BC_CARD_ID || '<SECRET>';
const bcCardPassword = process.env.BC_CARD_PASSWORD || '<SECRET>';

function parseCodefResponse(rawResponse) {
  return typeof rawResponse === 'string'
    ? JSON.parse(rawResponse)
    : rawResponse;
}

function createCodef() {
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

  const codef = new EasyCodef();

  codef.setPublicKey(CODEF_PUBLIC_KEY);
  codef.setClientInfoForDemo(CODEF_DEMO_CLIENT_ID, CODEF_DEMO_CLIENT_SECRET);

  if (CODEF_CLIENT_ID && CODEF_CLIENT_SECRET) {
    codef.setClientInfo(CODEF_CLIENT_ID, CODEF_CLIENT_SECRET);
  }

  return codef;
}

async function addBcCardAccount() {
  const { CODEF_CONNECTED_ID, CODEF_PUBLIC_KEY } = process.env;

  if (!CODEF_CONNECTED_ID) {
    throw new Error('CODEF_CONNECTED_ID 값이 필요함');
  }

  if (bcCardId === '<SECRET>' || bcCardPassword === '<SECRET>') {
    throw new Error('BC_CARD_ID / BC_CARD_PASSWORD 값이 필요함');
  }

  const codef = createCodef();
  const param = {
    connectedId: CODEF_CONNECTED_ID,
    accountList: [
      {
        countryCode: 'KR',
        businessType: 'CD',
        clientType: 'P',
        organization: '0305',
        loginType: '1',
        id: bcCardId,
        password: EasyCodefUtil.encryptRSA(CODEF_PUBLIC_KEY, bcCardPassword),
      },
    ],
  };

  const rawResponse = await codef.addAccount(
    EasyCodefConstant.SERVICE_TYPE_DEMO,
    param
  );

  const response = parseCodefResponse(rawResponse);
  const successList = response?.data?.successList || [];
  const errorList = response?.data?.errorList || [];

  console.dir({
    result: response?.result,
    successList: successList.map((account) => ({
      code: account.code,
      message: account.message,
      extraMessage: account.extraMessage,
      businessType: account.businessType,
      clientType: account.clientType,
      organization: account.organization,
      loginType: account.loginType,
    })),
    errorList: errorList.map((account) => ({
      code: account.code,
      message: account.message,
      extraMessage: account.extraMessage,
      businessType: account.businessType,
      clientType: account.clientType,
      organization: account.organization,
      loginType: account.loginType,
    })),
    connectedId: '<using CODEF_CONNECTED_ID from .env>',
  }, { depth: null });
}

addBcCardAccount().catch((error) => {
  console.error('기존 connectedId에 BC카드 계정 추가 중 오류 발생');
  console.error(error);
});
