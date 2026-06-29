require('dotenv').config({ quiet: true });

const {
  EasyCodef,
  EasyCodefConstant,
  EasyCodefUtil,
} = require('easycodef-node');

const ibkBankId = process.env.IBK_BANK_ID || '<SECRET>';
const ibkBankPassword = process.env.IBK_BANK_PASSWORD || '<SECRET>';

async function createIbkBankAccount() {
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

  if (ibkBankId === '<SECRET>' || ibkBankPassword === '<SECRET>') {
    throw new Error('IBK_BANK_ID / IBK_BANK_PASSWORD 값이 필요함');
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
        businessType: 'BK',
        clientType: 'P',
        organization: '0003',
        loginType: '1',
        id: ibkBankId,
        password: EasyCodefUtil.encryptRSA(CODEF_PUBLIC_KEY, ibkBankPassword),
      },
    ],
  };

  const rawResponse = await codef.createAccount(
    EasyCodefConstant.SERVICE_TYPE_DEMO,
    param
  );

  const response =
    typeof rawResponse === 'string'
      ? JSON.parse(rawResponse)
      : rawResponse;

  console.dir({
    result: response?.result,
    connectedId: response?.data?.connectedId || response?.connectedId
      ? '<redacted>'
      : undefined,
  }, { depth: null });
}

createIbkBankAccount().catch((error) => {
  console.error('기업은행 계정 등록 중 오류 발생');
  console.error(error);
});
