require('dotenv').config({ quiet: true });

const {
    EasyCodef,
    EasyCodefConstant,
} = require('easycodef-node');

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
    codef.setClientInfoForDemo(
        CODEF_DEMO_CLIENT_ID,
        CODEF_DEMO_CLIENT_SECRET
    );

    if (CODEF_CLIENT_ID && CODEF_CLIENT_SECRET) {
        codef.setClientInfo(CODEF_CLIENT_ID, CODEF_CLIENT_SECRET);
    }

    return codef;
}

function describeLoginType(loginType) {
    return {
        0: '인증서',
        1: '아이디',
        2: '빠른조회',
    }[loginType] || loginType || '';
}

async function main() {
    const { CODEF_CONNECTED_ID } = process.env;

    if (!CODEF_CONNECTED_ID) {
        throw new Error('CODEF_CONNECTED_ID 값이 필요함');
    }

    const codef = createCodef();

    console.log('CODEF 등록 삼성카드 계정 조회');

    const rawResponse = await codef.getAccountList(
        EasyCodefConstant.SERVICE_TYPE_DEMO,
        { connectedId: CODEF_CONNECTED_ID }
    );

    const response = parseCodefResponse(rawResponse);
    const accountList = response?.data?.accountList ?? [];
    const samsungAccounts = Array.isArray(accountList)
        ? accountList.filter((account) => account.organization === '0303')
        : [];

    console.dir({
        result: response?.result,
        samsungAccountCount: samsungAccounts.length,
        connectedId: response?.data?.connectedId ? '<redacted>' : undefined,
    }, { depth: null });

    if (response?.result?.code !== 'CF-00000') {
        console.error('조회 실패');
        console.error('code:', response?.result?.code);
        console.error('message:', response?.result?.message);
        console.error('extraMessage:', response?.result?.extraMessage);
        return;
    }

    console.log(`\n등록된 삼성카드 계정 ${samsungAccounts.length}건`);
    console.table(samsungAccounts.map((account) => ({
        기관: '삼성카드',
        기관코드: account.organization,
        업무구분: account.businessType,
        고객구분: account.clientType,
        로그인구분: describeLoginType(account.loginType),
        원문ID제공여부: account.id ? '제공됨(미출력)' : '미제공',
    })));
}

main().catch((error) => {
    console.error('CODEF 등록 삼성카드 계정 조회 중 오류 발생');
    console.error(error);
});
