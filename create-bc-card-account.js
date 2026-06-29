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

async function createBcCardAccount() {
  console.warn(
    '주의: 이 파일은 새 connectedId를 발급합니다. 기존 CODEF_CONNECTED_ID에 BC카드를 붙이려면 add-bc-card-account.js를 실행하세요.'
  );

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

  if (bcCardId === '<SECRET>' || bcCardPassword === '<SECRET>') {
    throw new Error('BC_CARD_ID / BC_CARD_PASSWORD 값이 필요함');
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
        organization: '0305',
        loginType: '1',
        id: bcCardId,
        password: EasyCodefUtil.encryptRSA(CODEF_PUBLIC_KEY, bcCardPassword),
      },
    ],
  };

  const rawResponse = await codef.createAccount(
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
    connectedId: response?.data?.connectedId || response?.connectedId
      ? '<redacted>'
      : undefined,
  }, { depth: null });
}

createBcCardAccount().catch((error) => {
  console.error('BC카드 계정 등록 중 오류 발생');
  console.error(error);
});
